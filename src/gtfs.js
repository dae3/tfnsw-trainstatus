const https = require('https');
const proto = require('pbf');
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

function getTrainsStatus() {
	return request(
		'https://api.transport.nsw.gov.au/v1/gtfs/alerts/sydneytrains',
		{ 
			resolveWithFullResponse : true,
			encoding : null,
			headers : { Authorization : `apikey ${process.env.TFNSW_API_KEY}` } 
		}
	);
}

function getEntity(datafile, filter) {
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
	return getEntity("../tt/stops.txt", 
		filter({ objectMode : true }, function(chunk) { return chunk.stop_id == stop_id })
	)
}
function getTrip(trip_id) {
	return getEntity("../tt/trips.txt", 
		filter({ objectMode : true }, function(chunk) { return chunk.trip_id == trip_id })
	)
}

function getRoute(route_id) {
	return getEntity("../tt/routes.txt", 
		filter({ objectMode : true }, function(chunk) { return chunk.route_id == route_id })
	)
}
