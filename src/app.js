'use strict';
require('dotenv').config();
const gtfs = require('./gtfs.js');
import { interval, from, subscribe } from 'rxjs';
import { mapTo, flatMap, map, take, mergeAll } from 'rxjs/operators';
const { print, stringify } = require('q-i');

exports.status = function(req, res) {
	if (req.method == 'GET' && req.query.line) {
		st = getTrainsStatus();
		st.on('end', () => res.status(200).end());
		st.pipe(res);
	} else {
		res.status(400).end('bad request');
	} 
}

const schema_o = from(gtfs.getGTFSSchema());
const timer_o = interval(50).pipe(take(2));
var alerts_o;

schema_o.subscribe(schema => {
	alerts_o = timer_o.pipe(
		mapTo( from(gtfs.getTrainsStatus() ) ),
		mergeAll(), 		// resolve nested Promises emitted
		map(raw => gtfs.parseGTFS(raw.body)),
		map(cooked => schema.FeedMessage.read(cooked).entity),
		mergeAll()
	)
	
	alerts_o.subscribe(print)
})

