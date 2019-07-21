'use strict';
require('dotenv').config();
const request = require('request-promise-native');
const gtfs = require('./gtfs.js');
import { merge, interval, from } from 'rxjs';
import { flatMap, filter, distinctUntilKeyChanged, mapTo, map, take, mergeAll } from 'rxjs/operators';
const { print, stringify } = require('q-i');

const schema = from(gtfs.getGTFSSchema());
const timer = interval(1000).pipe(take(3));

schema.subscribe(schema => {
	const alerts = timer.pipe(
		mapTo( from(gtfs.getTrainsStatus() ) ),
		mergeAll(), 		// resolve nested Promises emitted
		map(raw => gtfs.parseGTFS(raw.body)),
		map(cooked => schema.FeedMessage.read(cooked).entity),
		mergeAll()
	)

	const all_stop_alerts = alerts.pipe(filter(e => e.alert.informed_entity[0].stop_id));
	const all_trip_alerts = alerts.pipe(filter(e => e.alert.informed_entity[0].trip));
	const all_route_alerts = alerts.pipe(filter(e => e.alert.informed_entity[0].route_id));

	const user_all = merge(
		alerts.pipe( filter(stop_filter('278210') ) ),
		alerts.pipe( filter(stop_filter('2782181') ) ),
		alerts.pipe( filter(stop_filter('2782182') ) ),
		alerts.pipe( filter(stop_filter('200060') ) ),
		alerts.pipe( filter(stop_filter('206520') ) ),
		alerts.pipe( filter(route_filter('BMT_1') ) ),
		alerts.pipe( filter(route_filter('BMT_2') ) ),
		alerts.pipe( filter(route_filter('WST_1a') ) ),
		alerts.pipe( filter(route_filter('WST_1b') ) ),
		alerts.pipe( filter(route_filter('WST_2c') ) ),
		alerts.pipe( filter(route_filter('WST_2d') ) ),
		alerts.pipe( filter(trip_filter('W512') ) ),
		alerts.pipe( filter(trip_filter('W579') ) )
	);

	user_all
		.pipe( flatMap(alert_formatter), distinctUntilKeyChanged('message') )
		.subscribe(print)
})

function send_notification(alert) {
	request(
		'https://maker.ifttt.com/trigger/trainstatus/with/key/Qqw2HEP21J5pq3rS0lUm2/',
		{
			method : 'POST',
			headers : { 'Content-Type' : 'application/json' },
			json : true,
			body : { value1 : alert.title, value2: alert.message, value3: alert.link }
		}
	)
		.then( () => { /* don't care */ } )
		.catch( () => { /* don't care */ } )
}

function alert_formatter(entity) {
	return from(new Promise( function(resolve, reject) {
		var entities = entity.alert.informed_entity.map(gtfs.getEntityName);
		Promise.all(entities).then(ea => {
				resolve(
					{
						'title' : entity.alert.header_text.translation[0].text + '(' +
							ea.filter((e,i,a) => i == 0 ? true : !a.slice(0,i).includes(e))
							.reduce((a,v,i)=>a+(i>0?', ':'')+v, '') + ')' ,
						'message' : entity.alert.description_text.translation[0].text,
						'link'  : entity.alert.url.translation[0].text
					}
				)
			})
	})
	)
}


function entity_id(entity) {
	if (entity.trip) {
		return entity.trip
	} else if (entity.stop_id != '') {
		return entity.stop_id
	} else if (entity.route_id != '') {
		return entity.route_id
	} else {
		return 'unknown'
	}
}

function stop_filter(id) {
	return (entity) => entity.alert.informed_entity.map(i=>i.stop_id).includes(id)
}
function route_filter(id) {
	return (entity) => entity.alert.informed_entity.map(i=>i.route_id).includes(id)
}
function trip_filter(id) {
	return (entity) => entity.alert.informed_entity.trip && entity.alert.informed_entity.map(i=>i.trip.trip_id.slice(0, trip_id.indexOf('.')-1)).includes(id)
}
