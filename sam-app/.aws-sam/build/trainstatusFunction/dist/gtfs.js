"use strict";

var https = require('https');

var proto = require('pbf');

var protocomp = require('pbf/compile');

var protoschema = require('protocol-buffers-schema');

var request = require('request-promise-native');

var fs = require('fs');

var filter = require('through2-filter');

var _require = require('q-i'),
    print = _require.print,
    stringify = _require.stringify;

var aws = require('aws-sdk');

var streambuf = require('stream-buffers');

var cloneable = require('cloneable-readable');

function getGTFSSchema() {
  return new Promise(function (resolve, reject) {
    var s3 = new aws.S3();
    s3.getObject({
      Bucket: 'tfnsw-gtfs',
      Key: 'gtfs-realtime.proto'
    }).promise().then(function (res) {
      resolve(protocomp(protoschema.parse(res.Body.toString())));
    })["catch"](reject);
  });
} // returns a Promise that resolves to an encoded GTFS FeedMessage


function getTrainsStatus() {
  return request('https://api.transport.nsw.gov.au/v1/gtfs/alerts/sydneytrains', {
    resolveWithFullResponse: true,
    encoding: null,
    headers: {
      Authorization: "apikey ".concat(process.env.TFNSW_API_KEY)
    }
  });
}

function parseGTFS(raw_resp) {
  return new proto(raw_resp);
}

; // gtfs: gtfs schema object
// gtfs_feedmessage: an encoded GTFS FeedMessage
// returns: an array of Promises resolving to entity detail object

function processFeedMessage(gtfs, gtfs_feedmessage) {
  var entities = [];
  gtfs.FeedMessage.read(gtfs_feedmessage).entity.forEach(function (e) {
    return entities.push(getEntity(e));
  });
  return entities;
}

function getEntityName(entity) {
  if (entity.trip) {
    return getTrip(entity.trip.trip_id);
  } else if (entity.stop_id != '') {
    return getStop(entity.stop_id);
  } else if (entity.route_id != '') {
    return getRoute(entity.route_id);
  }
}

function getEntity(gtfs_entity) {
  if (gtfs_entity.alert.informed_entity[0].trip) {
    return getTrip(gtfs_entity.alert.informed_entity[0].trip);
  } else if (gtfs_entity.alert.informed_entity[0].stop_id) {
    return getStop(gtfs_entity.alert.informed_entity[0].stop_id);
  } else if (gtfs_entity.alert.informed_entity[0].route_id) {
    return getRoute(gtfs_entity.alert.informed_entity[0].route_id);
  }
}

function getEntityFromDb(datafile, filter, callback) {
  // TODO pull csv-streamify require to global scope
  var PREFIX = '/tmp/';
  var db;

  var csv_parser = require('csv-streamify')({
    columns: true,
    objectMode: true
  });

  return new Promise(function (resolve, reject) {
    fs.access(PREFIX + datafile, fs.constants.R_OK, function (err) {
      if (err) {
        console.log("cacheing ".concat(datafile));
        var s3 = new aws.S3();
        db = cloneable(s3.getObject({
          Bucket: 'tfnsw-gtfs',
          Key: datafile
        }).createReadStream());
        db.clone().pipe(fs.createWriteStream(PREFIX + datafile));
        db.pipe(csv_parser).pipe(filter);
      } else {
        console.log("cache hit ".concat(datafile));
        fs.createReadStream(PREFIX + datafile).pipe(csv_parser).pipe(filter);
      }
    });
    filter.on('data', resolve);
  });
}

function getRoute(route_id) {
  return new Promise(function (resolve, reject) {
    getEntityFromDb("routes.txt", filter({
      objectMode: true
    }, function (chunk) {
      return chunk.route_id == route_id;
    })).then(function (route) {
      return resolve(route.route_short_name);
    });
  });
}

function getTrip(trip_id) {
  return new Promise(function (resolve, reject) {
    getEntityFromDb("trips.txt", filter({
      objectMode: true
    }, function (chunk) {
      return chunk.trip_id == trip_id;
    })).then(function (trip) {
      return resolve(trip.trip_headsign);
    });
  });
}

function getStop(stop_id) {
  return new Promise(function (resolve, reject) {
    getEntityFromDb("stops.txt", filter({
      objectMode: true
    }, function (chunk) {
      return chunk.stop_id == stop_id;
    })).then(function (stop) {
      return resolve(stop.stop_name);
    });
  });
}

module.exports = {
  getGTFSSchema: getGTFSSchema,
  getTrainsStatus: getTrainsStatus,
  processFeedMessage: processFeedMessage,
  parseGTFS: parseGTFS,
  getEntityName: getEntityName,
  getEntity: getEntity
};