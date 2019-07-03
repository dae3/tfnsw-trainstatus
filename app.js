'use strict';
const https = require('https');
const express = require('express');
const app = express();
const TFNSW_API_KEY = process.env.TFNSW_API_KEY;
// const proto = require('protocol-buffers');
const proto = require('pbf');
const protocomp = require('pbf/compile');
const protoschema = require('protocol-buffers-schema');
const request = require('request-promise-native');
const { print, stringify } = require('q-i');
const fs = require('fs');

//app.get('/', function(req, res) {});

//app.listen(8080);

exports.status = function(req, res) {
	if (req.method == 'GET' && req.query.line) {
		st = getTrainsStatus();
		st.on('end', () => res.status(200).end());
		st.pipe(res);
	} else {
		res.status(400).end('bad request');
	} 
}

function getGTFSSchema() {
	return new Promise(function(resolve, reject) {
		request('https://developers.google.com/transit/gtfs-realtime/gtfs-realtime.proto', { resolveWithFullResponse : true } )
			.then( res => {
				if (res.statusCode == 200) {
					resolve(protocomp(protoschema.parse(res.body)));
				} else {
					reject(`Couldn't download schema: ${res.statusCode}`);
				}
			})
			.catch( reject );
	});
}

function getTrainsStatus() {
	return request(
		'https://api.transport.nsw.gov.au/v1/gtfs/alerts/sydneytrains',
		{ 
			resolveWithFullResponse : true,
			encoding : null,
			headers : { Authorization : 'apikey w7QwFEj6bwBLmulA8AYXtRkHcJc4RSPx3ye7' } 
		}
	);
}

function getTrip(trip_id) {
	return new Promise(function(resolve, reject) {
		try {
			const trip_parser = require('through2-filter')({objectMode : true}, function(chunk) {
				return chunk.trip_id == trip_id;
			});
			const csv_parser = require('csv-streamify')({ columns : true, objectMode : true });
			trip_parser.on('data', resolve);

			fs.createReadStream('tt/trips.txt').pipe(csv_parser).pipe(trip_parser);
		} catch (err) {
			reject(err);
		}
	});
}
function sendTriggerToIFTTT(statusArray) {
	var postData = { 'value1' : statusArray[0], 'value2' : statusArray[1] };
	var postOptions = { 
		'method' : 'post',
		'contentType': 'application/json',
		'payload' : JSON.stringify(postData)
	};
	//	var trigger = UrlFetchApp.fetch(
	//		'https://maker.ifttt.com/trigger/train_status_received/with/key/brp_hwHjO0oMMOCJTmBGDC',
	//		postOptions
	//	);
}
function entityText(entity) { return entity.alert.header_text.translation[0].text + ' ' + 
		entity.alert.description_text.translation[0].text; }

getTrip("1--A.1293.117.68.B.8.57383532")
	.then(print)
	.catch(e => console.log(e));

// getGTFSSchema()
// 	.then( gtfs => { 
// 		getTrainsStatus().then( res => {
// 			var data = new proto(res.body);
// 			gtfs.FeedMessage.read(data).entity.forEach( entity => {
// 				if (entity.alert.informed_entity[0].route_id) { console.log(`route ${entityText(entity)}`); }
// 				if (entity.alert.informed_entity[0].trip) { console.log(`trip ${entityText(entity)}`); }
// 				if (entity.alert.informed_entity[0].stop_id) { console.log(`station ${entityText(entity)}`); }
// 			});
// 		})
// 	})
// 	.catch( err => console.log(err.message) );
