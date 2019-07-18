const https = require('https');
const proto = require('pbf');
const protocomp = require('pbf/compile');
const protoschema = require('protocol-buffers-schema');
const request = require('request-promise-native');
const fs = require('fs');
const filter = require('through2-filter');

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
	return new Promise(function(resolve, reject) {
		try {
			const csv_parser = require('csv-streamify')({ columns : true, objectMode : true });
			filter.on('data', resolve);

			fs.createReadStream(datafile).pipe(csv_parser).pipe(filter);
		} catch (err) {
			reject(err);
		}
	});
}

function getStop(stop_id) {
	return getEntityFromDb("tt/stops.txt", 
		filter({ objectMode : true }, function(chunk) { return chunk.stop_id == stop_id })
	)
}
function getTrip(trip_id) {
	return getEntityFromDb("tt/trips.txt", 
		filter({ objectMode : true }, function(chunk) { return chunk.trip_id == trip_id })
	)
}

function getRoute(route_id) {
	return getEntityFromDb("tt/routes.txt", 
		filter({ objectMode : true }, function(chunk) { return chunk.route_id == route_id })
	)
}

module.exports = { getGTFSSchema, getTrainsStatus, processFeedMessage, parseGTFS }
