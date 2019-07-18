'use strict';
require('dotenv').config();
const gtfs = require('./gtfs.js');
import { interval, from } from 'rxjs';
import { filter, mapTo, map, take, mergeAll } from 'rxjs/operators';
const { print, stringify } = require('q-i');

const schema = from(gtfs.getGTFSSchema());
const timer = interval(50).pipe(take(1));

schema.subscribe(schema => {
	const alerts = timer.pipe(
		mapTo( from(gtfs.getTrainsStatus() ) ),
		mergeAll(), 		// resolve nested Promises emitted
		map(raw => gtfs.parseGTFS(raw.body)),
		map(cooked => schema.FeedMessage.read(cooked).entity),
		mergeAll()
	)
	
	const stop_alerts = alerts.pipe(filter(e => e.alert.informed_entity[0].stop_id));
	const trip_alerts = alerts.pipe(filter(e => e.alert.informed_entity[0].trip));
	const route_alerts = alerts.pipe(filter(e => e.alert.informed_entity[0].route_id));

	//	trip_alerts.subscribe(print);
	// route_alerts.subscribe(print);
	// stl 206520, wwf 278210
	stop_alerts.pipe(
		filter(e => e.alert.informed_entity.map(i=>i.stop_id).includes('278210'))
	).subscribe(print);

	route_alerts.pipe(
		filter(e => e.alert.informed_entity.map(i=>i.route_id).includes('CCN_1a'))
	).subscribe(print);
})

