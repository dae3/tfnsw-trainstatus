const https = require('https');
const path = require('path');
const proto = require('pbf');
const protocomp = require('pbf/compile');
const protoschema = require('protocol-buffers-schema');
const request = require('request-promise-native');
const fs = require('fs');
const filter = require('through2-filter');
const { print, stringify } = require('q-i');
const aws = require('aws-sdk');
const streambuf = require('stream-buffers');
const cloneable = require('cloneable-readable');
const csv_parser = require('csv-streamify');

function getGTFSSchema() {
  return new Promise((resolve, reject) => {
    fs.readFile('./gtfs-realtime.proto', (err, content) => { resolve(protocomp(protoschema.parse(content))) })
  });

	return new Promise(function(resolve, reject) {
		const s3 = new aws.S3();
		s3.getObject({Bucket:'tfnsw-gtfs',Key:'gtfs-realtime.proto'}).promise()
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

function getEntityFromDb(datafile, filter, callback) {
  return new Promise( function(resolve, reject) {
    const cachefile = path.format({dir: process.env.TEMP, name: datafile});
    const parser = csv_parser({ columns : true, objectMode : true });
    fs.open(cachefile, (err, fd) => {
      if (!err) {
        console.log(`cache hit for ${datafile} in ${cachefile}`);
        fs.createReadStream('', { fd: fd }).pipe(parser).pipe(filter);
      } else {
        console.log(`cacheing ${datafile} in ${cachefile}`);
        const s3 = new aws.S3();
        var db = s3.getObject({Bucket:'tfnsw-gtfs',Key:datafile}).createReadStream();
        db.on('end', () => { fs.createReadStream(cachefile).pipe(parser).pipe(filter) })
        db.pipe(fs.createWriteStream(cachefile));
      }
      filter.on('data', resolve);
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
