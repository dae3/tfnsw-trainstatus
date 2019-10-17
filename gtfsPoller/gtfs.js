require('dotenv').config();
const https = require('https');
const through2 = require('through2');
const path = require('path');
const proto = require('pbf');
const protocomp = require('pbf/compile');
const protoschema = require('protocol-buffers-schema');
const request = require('request-promise-native');
const fs = require('fs');
const filter = require('through2-filter');
const aws = require('aws-sdk');
const csv_parser = require('csv-streamify');
const StreamCatcher = require('stream-catcher');
const cache = new StreamCatcher();

function getGTFSSchema() {
//  return new Promise((resolve, reject) => {
//    fs.readFile('./gtfs-realtime.proto', (err, content) => { resolve(protocomp(protoschema.parse(content))) })
//  });

	return new Promise(function(resolve, reject) {
		const s3 = new aws.S3();
		s3.getObject(
			{ Bucket:`${process.env.TFNSW_PREFIX}-${process.env.TFNSW_ENV}-gtfs`, Key:'gtfs-realtime.proto' }
		).promise()
			.then( res => { resolve(protocomp(protoschema.parse(res.Body.toString()))) })
			.catch( reject );
	});
}

// returns a Promise that resolves to an encoded GTFS FeedMessage
function getTrainsStatus() {
		return request(
			'https://api.transport.nsw.gov.au/v1/gtfs/alerts/sydneytrains',
			{ 
				resolveWithFullResponse : true,
				encoding : null,
				headers : { Authorization : `apikey ${process.env.TFNSW_API_KEY}` } 
			}
		)
}

function parseGTFS(raw_resp) {
	return new proto(raw_resp);
};

// gtfs: gtfs schema object
// gtfs_feedmessage: an encoded GTFS FeedMessage
// returns: an array of Promises resolving to entity detail object
function processFeedMessage(gtfs, gtfs_feedmessage) {
	const entities = [];
	gtfs.FeedMessage.read(gtfs_feedmessage).entity.forEach(e=>entities.push(getEntity(e)));
	return entities;
}

function getEntityName(entity) {
	if (entity.trip) {
		return getTrip(entity.trip.trip_id)
	} else if (entity.stop_id != '') {
		return getStop(entity.stop_id)
	} else if (entity.route_id != '') {
		return getRoute(entity.route_id)
	}
}

function getEntity(gtfs_entity) {
	if (gtfs_entity.alert.informed_entity[0].trip) {
		return getTrip(gtfs_entity.alert.informed_entity[0].trip)
	} else if (gtfs_entity.alert.informed_entity[0].stop_id) {
		return getStop(gtfs_entity.alert.informed_entity[0].stop_id)
	} else if (gtfs_entity.alert.informed_entity[0].route_id) {
		return getRoute(gtfs_entity.alert.informed_entity[0].route_id)
	}
}


function getEntityFromDb(datafile, filter) {
	const s3 = new aws.S3();

	return new Promise((resolve, reject) =>
		{
			const parser = csv_parser({ columns : true, objectMode : true });
			parser.pipe(filter);
			filter.on('data', resolve);

			cache.write(datafile, parser, () => {
				try {
					const s3s = s3.getObject(
						{ Bucket : `${process.env.TFNSW_PREFIX}-${process.env.TFNSW_ENV}-gtfs`, Key : datafile }
					).createReadStream();
					// StreamCatcher will add as many listeners to this stream as their are cache clients
					// High end number observed is an event affecting 20-30 stations
					s3s.setMaxListeners(50);
					cache.read(datafile, s3s);
				} catch (err) {
					reject(err)
				}
			})
	})
}

function getRoute(route_id) {
	return new Promise((resolve, reject) => {
		getEntityFromDb(
			"routes.txt", 
			filter({ objectMode : true }, function(chunk) { return chunk.route_id == route_id })
		)
			.then((route) => resolve(route.route_short_name))
		})
}

function getTrip(trip_id) {
	return new Promise((resolve, reject) => {
		getEntityFromDb(
			"trips.txt", 
			filter({ objectMode : true }, function(chunk) { return chunk.trip_id == trip_id })
		)
			.then((trip) => resolve(trip.trip_headsign))
		})
}

function getStop(stop_id) {
	return new Promise((resolve, reject) => {
		getEntityFromDb(
			"stops.txt", 
			filter({ objectMode : true }, function(chunk) { return chunk.stop_id == stop_id })
		)
			.then((stop) => resolve(stop.stop_name))
		})
}
module.exports = { getGTFSSchema, getTrainsStatus, processFeedMessage, parseGTFS, getEntityName, getEntity }
