"use strict";

const https = require('https');

const through2 = require('through2');

const path = require('path');

const proto = require('pbf');

const protocomp = require('pbf/compile');

const protoschema = require('protocol-buffers-schema');

const request = require('request-promise-native');

const fs = require('fs');

const filter = require('through2-filter');

const {
  print,
  stringify
} = require('q-i');

const aws = require('aws-sdk');

const csv_parser = require('csv-streamify');

const StreamCatcher = require('stream-catcher');

const cache = new StreamCatcher();

function getGTFSSchema() {
  return new Promise((resolve, reject) => {
    fs.readFile('./gtfs-realtime.proto', (err, content) => {
      resolve(protocomp(protoschema.parse(content)));
    });
  });
  return new Promise(function (resolve, reject) {
    const s3 = new aws.S3();
    s3.getObject({
      Bucket: 'tfnsw-gtfs',
      Key: 'gtfs-realtime.proto'
    }).promise().then(res => {
      resolve(protocomp(protoschema.parse(res.Body.toString())));
    }).catch(reject);
  });
} // returns a Promise that resolves to an encoded GTFS FeedMessage


function getTrainsStatus() {
  return request('https://api.transport.nsw.gov.au/v1/gtfs/alerts/sydneytrains', {
    resolveWithFullResponse: true,
    encoding: null,
    headers: {
      Authorization: `apikey ${process.env.TFNSW_API_KEY}`
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
  const entities = [];
  gtfs.FeedMessage.read(gtfs_feedmessage).entity.forEach(e => entities.push(getEntity(e)));
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

function getEntityFromDb(datafile, filter) {
  const s3 = new aws.S3();
  return new Promise((resolve, reject) => {
    const parser = csv_parser({
      columns: true,
      objectMode: true
    });
    parser.pipe(filter);
    filter.on('data', resolve);
    cache.write(datafile, parser, () => {
      const s3s = s3.getObject({
        Bucket: 'tfnsw-gtfs',
        Key: datafile
      }).createReadStream(); // StreamCatcher will add as many listeners to this stream as their are cache clients
      // High end number observed is an event affecting 20-30 stations

      s3s.setMaxListeners(50);
      cache.read(datafile, s3s);
    });
  });
}

function getRoute(route_id) {
  return new Promise((resolve, reject) => {
    getEntityFromDb("routes.txt", filter({
      objectMode: true
    }, function (chunk) {
      return chunk.route_id == route_id;
    })).then(route => resolve(route.route_short_name));
  });
}

function getTrip(trip_id) {
  return new Promise((resolve, reject) => {
    getEntityFromDb("trips.txt", filter({
      objectMode: true
    }, function (chunk) {
      return chunk.trip_id == trip_id;
    })).then(trip => resolve(trip.trip_headsign));
  });
}

function getStop(stop_id) {
  return new Promise((resolve, reject) => {
    getEntityFromDb("stops.txt", filter({
      objectMode: true
    }, function (chunk) {
      return chunk.stop_id == stop_id;
    })).then(stop => resolve(stop.stop_name));
  });
}

module.exports = {
  getGTFSSchema,
  getTrainsStatus,
  processFeedMessage,
  parseGTFS,
  getEntityName,
  getEntity
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9ndGZzLmpzIl0sIm5hbWVzIjpbImh0dHBzIiwicmVxdWlyZSIsInRocm91Z2gyIiwicGF0aCIsInByb3RvIiwicHJvdG9jb21wIiwicHJvdG9zY2hlbWEiLCJyZXF1ZXN0IiwiZnMiLCJmaWx0ZXIiLCJwcmludCIsInN0cmluZ2lmeSIsImF3cyIsImNzdl9wYXJzZXIiLCJTdHJlYW1DYXRjaGVyIiwiY2FjaGUiLCJnZXRHVEZTU2NoZW1hIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJyZWFkRmlsZSIsImVyciIsImNvbnRlbnQiLCJwYXJzZSIsInMzIiwiUzMiLCJnZXRPYmplY3QiLCJCdWNrZXQiLCJLZXkiLCJwcm9taXNlIiwidGhlbiIsInJlcyIsIkJvZHkiLCJ0b1N0cmluZyIsImNhdGNoIiwiZ2V0VHJhaW5zU3RhdHVzIiwicmVzb2x2ZVdpdGhGdWxsUmVzcG9uc2UiLCJlbmNvZGluZyIsImhlYWRlcnMiLCJBdXRob3JpemF0aW9uIiwicHJvY2VzcyIsImVudiIsIlRGTlNXX0FQSV9LRVkiLCJwYXJzZUdURlMiLCJyYXdfcmVzcCIsInByb2Nlc3NGZWVkTWVzc2FnZSIsImd0ZnMiLCJndGZzX2ZlZWRtZXNzYWdlIiwiZW50aXRpZXMiLCJGZWVkTWVzc2FnZSIsInJlYWQiLCJlbnRpdHkiLCJmb3JFYWNoIiwiZSIsInB1c2giLCJnZXRFbnRpdHkiLCJnZXRFbnRpdHlOYW1lIiwidHJpcCIsImdldFRyaXAiLCJ0cmlwX2lkIiwic3RvcF9pZCIsImdldFN0b3AiLCJyb3V0ZV9pZCIsImdldFJvdXRlIiwiZ3Rmc19lbnRpdHkiLCJhbGVydCIsImluZm9ybWVkX2VudGl0eSIsImdldEVudGl0eUZyb21EYiIsImRhdGFmaWxlIiwicGFyc2VyIiwiY29sdW1ucyIsIm9iamVjdE1vZGUiLCJwaXBlIiwib24iLCJ3cml0ZSIsInMzcyIsImNyZWF0ZVJlYWRTdHJlYW0iLCJzZXRNYXhMaXN0ZW5lcnMiLCJjaHVuayIsInJvdXRlIiwicm91dGVfc2hvcnRfbmFtZSIsInRyaXBfaGVhZHNpZ24iLCJzdG9wIiwic3RvcF9uYW1lIiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7QUFBQSxNQUFNQSxLQUFLLEdBQUdDLE9BQU8sQ0FBQyxPQUFELENBQXJCOztBQUNBLE1BQU1DLFFBQVEsR0FBR0QsT0FBTyxDQUFDLFVBQUQsQ0FBeEI7O0FBQ0EsTUFBTUUsSUFBSSxHQUFHRixPQUFPLENBQUMsTUFBRCxDQUFwQjs7QUFDQSxNQUFNRyxLQUFLLEdBQUdILE9BQU8sQ0FBQyxLQUFELENBQXJCOztBQUNBLE1BQU1JLFNBQVMsR0FBR0osT0FBTyxDQUFDLGFBQUQsQ0FBekI7O0FBQ0EsTUFBTUssV0FBVyxHQUFHTCxPQUFPLENBQUMseUJBQUQsQ0FBM0I7O0FBQ0EsTUFBTU0sT0FBTyxHQUFHTixPQUFPLENBQUMsd0JBQUQsQ0FBdkI7O0FBQ0EsTUFBTU8sRUFBRSxHQUFHUCxPQUFPLENBQUMsSUFBRCxDQUFsQjs7QUFDQSxNQUFNUSxNQUFNLEdBQUdSLE9BQU8sQ0FBQyxpQkFBRCxDQUF0Qjs7QUFDQSxNQUFNO0FBQUVTLEVBQUFBLEtBQUY7QUFBU0MsRUFBQUE7QUFBVCxJQUF1QlYsT0FBTyxDQUFDLEtBQUQsQ0FBcEM7O0FBQ0EsTUFBTVcsR0FBRyxHQUFHWCxPQUFPLENBQUMsU0FBRCxDQUFuQjs7QUFDQSxNQUFNWSxVQUFVLEdBQUdaLE9BQU8sQ0FBQyxlQUFELENBQTFCOztBQUNBLE1BQU1hLGFBQWEsR0FBR2IsT0FBTyxDQUFDLGdCQUFELENBQTdCOztBQUNBLE1BQU1jLEtBQUssR0FBRyxJQUFJRCxhQUFKLEVBQWQ7O0FBRUEsU0FBU0UsYUFBVCxHQUF5QjtBQUN2QixTQUFPLElBQUlDLE9BQUosQ0FBWSxDQUFDQyxPQUFELEVBQVVDLE1BQVYsS0FBcUI7QUFDdENYLElBQUFBLEVBQUUsQ0FBQ1ksUUFBSCxDQUFZLHVCQUFaLEVBQXFDLENBQUNDLEdBQUQsRUFBTUMsT0FBTixLQUFrQjtBQUFFSixNQUFBQSxPQUFPLENBQUNiLFNB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U0FBTixDQUp4QjtBQUtDLEdBTkssQ0FBUDtBQU9BOztBQUNEQyxNQUFNLENBQUNDLE9BQVAsR0FBaUI7QUFBRXJFLEVBQUFBLGFBQUY7QUFBaUJtQixFQUFBQSxlQUFqQjtBQUFrQ1UsRUFBQUEsa0JBQWxDO0FBQXNERixFQUFBQSxTQUF0RDtBQUFpRWEsRUFBQUEsYUFBakU7QUFBZ0ZELEVBQUFBO0FBQWhGLENBQWpCIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgaHR0cHMgPSByZXF1aXJlKCdodHRwcycpO1xyXG5jb25zdCB0aHJvdWdoMiA9IHJlcXVpcmUoJ3Rocm91Z2gyJyk7XHJcbmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XHJcbmNvbnN0IHByb3RvID0gcmVxdWlyZSgncGJmJyk7XHJcbmNvbnN0IHByb3RvY29tcCA9IHJlcXVpcmUoJ3BiZi9jb21waWxlJyk7XHJcbmNvbnN0IHByb3Rvc2NoZW1hID0gcmVxdWlyZSgncHJvdG9jb2wtYnVmZmVycy1zY2hlbWEnKTtcclxuY29uc3QgcmVxdWVzdCA9IHJlcXVpcmUoJ3JlcXVlc3QtcHJvbWlzZS1uYXRpdmUnKTtcclxuY29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xyXG5jb25zdCBmaWx0ZXIgPSByZXF1aXJlKCd0aHJvdWdoMi1maWx0ZXInKTtcclxuY29uc3QgeyBwcmludCwgc3RyaW5naWZ5IH0gPSByZXF1aXJlKCdxLWknKTtcclxuY29uc3QgYXdzID0gcmVxdWlyZSgnYXdzLXNkaycpO1xyXG5jb25zdCBjc3ZfcGFyc2VyID0gcmVxdWlyZSgnY3N2LXN0cmVhbWlmeScpO1xyXG5jb25zdCBTdHJlYW1DYXRjaGVyID0gcmVxdWlyZSgnc3RyZWFtLWNhdGNoZXInKTtcclxuY29uc3QgY2FjaGUgPSBuZXcgU3RyZWFtQ2F0Y2hlcigpO1xyXG5cclxuZnVuY3Rpb24gZ2V0R1RGU1NjaGVtYSgpIHtcclxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgZnMucmVhZEZpbGUoJy4vZ3Rmcy1yZWFsdGltZS5wcm90bycsIChlcnIsIGNvbnRlbnQpID0+IHsgcmVzb2x2ZShwcm90b2NvbXAocHJvdG9zY2hlbWEucGFyc2UoY29udGVudCkpKSB9KVxyXG4gIH0pO1xyXG5cclxuXHRyZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblx0XHRjb25zdCBzMyA9IG5ldyBhd3MuUzMoKTtcclxuXHRcdHMzLmdldE9iamVjdCh7QnVja2V0Oid0Zm5zdy1ndGZzJyxLZXk6J2d0ZnMtcmVhbHRpbWUucHJvdG8nfSkucHJvbWlzZSgpXHJcblx0XHRcdC50aGVuKCByZXMgPT4geyByZXNvbHZlKHByb3RvY29tcChwcm90b3NjaGVtYS5wYXJzZShyZXMuQm9keS50b1N0cmluZygpKSkpIH0pXHJcblx0XHRcdC5jYXRjaCggcmVqZWN0ICk7XHJcblx0fSk7XHJcbn1cclxuXHJcbi8vIHJldHVybnMgYSBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gYW4gZW5jb2RlZCBHVEZTIEZlZWRNZXNzYWdlXHJcbmZ1bmN0aW9uIGdldFRyYWluc1N0YXR1cygpIHtcclxuXHRcdHJldHVybiByZXF1ZXN0KFxyXG5cdFx0XHQnaHR0cHM6Ly9hcGkudHJhbnNwb3J0Lm5zdy5nb3YuYXUvdjEvZ3Rmcy9hbGVydHMvc3lkbmV5dHJhaW5zJyxcclxuXHRcdFx0eyBcclxuXHRcdFx0XHRyZXNvbHZlV2l0aEZ1bGxSZXNwb25zZSA6IHRydWUsXHJcblx0XHRcdFx0ZW5jb2RpbmcgOiBudWxsLFxyXG5cdFx0XHRcdGhlYWRlcnMgOiB7IEF1dGhvcml6YXRpb24gOiBgYXBpa2V5ICR7cHJvY2Vzcy5lbnYuVEZOU1dfQVBJX0tFWX1gIH0gXHJcblx0XHRcdH1cclxuXHRcdClcclxufVxyXG5cclxuZnVuY3Rpb24gcGFyc2VHVEZTKHJhd19yZXNwKSB7XHJcblx0cmV0dXJuIG5ldyBwcm90byhyYXdfcmVzcCk7XHJcbn07XHJcblxyXG4vLyBndGZzOiBndGZzIHNjaGVtYSBvYmplY3RcclxuLy8gZ3Rmc19mZWVkbWVzc2FnZTogYW4gZW5jb2RlZCBHVEZTIEZlZWRNZXNzYWdlXHJcbi8vIHJldHVybnM6IGFuIGFycmF5IG9mIFByb21pc2VzIHJlc29sdmluZyB0byBlbnRpdHkgZGV0YWlsIG9iamVjdFxyXG5mdW5jdGlvbiBwcm9jZXNzRmVlZE1lc3NhZ2UoZ3RmcywgZ3Rmc19mZWVkbWVzc2FnZSkge1xyXG5cdGNvbnN0IGVudGl0aWVzID0gW107XHJcblx0Z3Rmcy5GZWVkTWVzc2FnZS5yZWFkKGd0ZnNfZmVlZG1lc3NhZ2UpLmVudGl0eS5mb3JFYWNoKGU9PmVudGl0aWVzLnB1c2goZ2V0RW50aXR5KGUpKSk7XHJcblx0cmV0dXJuIGVudGl0aWVzO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRFbnRpdHlOYW1lKGVudGl0eSkge1xyXG5cdGlmIChlbnRpdHkudHJpcCkge1xyXG5cdFx0cmV0dXJuIGdldFRyaXAoZW50aXR5LnRyaXAudHJpcF9pZClcclxuXHR9IGVsc2UgaWYgKGVudGl0eS5zdG9wX2lkICE9ICcnKSB7XHJcblx0XHRyZXR1cm4gZ2V0U3RvcChlbnRpdHkuc3RvcF9pZClcclxuXHR9IGVsc2UgaWYgKGVudGl0eS5yb3V0ZV9pZCAhPSAnJykge1xyXG5cdFx0cmV0dXJuIGdldFJvdXRlKGVudGl0eS5yb3V0ZV9pZClcclxuXHR9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEVudGl0eShndGZzX2VudGl0eSkge1xyXG5cdGlmIChndGZzX2VudGl0eS5hbGVydC5pbmZvcm1lZF9lbnRpdHlbMF0udHJpcCkge1xyXG5cdFx0cmV0dXJuIGdldFRyaXAoZ3Rmc19lbnRpdHkuYWxlcnQuaW5mb3JtZWRfZW50aXR5WzBdLnRyaXApXHJcblx0fSBlbHNlIGlmIChndGZzX2VudGl0eS5hbGVydC5pbmZvcm1lZF9lbnRpdHlbMF0uc3RvcF9pZCkge1xyXG5cdFx0cmV0dXJuIGdldFN0b3AoZ3Rmc19lbnRpdHkuYWxlcnQuaW5mb3JtZWRfZW50aXR5WzBdLnN0b3BfaWQpXHJcblx0fSBlbHNlIGlmIChndGZzX2VudGl0eS5hbGVydC5pbmZvcm1lZF9lbnRpdHlbMF0ucm91dGVfaWQpIHtcclxuXHRcdHJldHVybiBnZXRSb3V0ZShndGZzX2VudGl0eS5hbGVydC5pbmZvcm1lZF9lbnRpdHlbMF0ucm91dGVfaWQpXHJcblx0fVxyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0RW50aXR5RnJvbURiKGRhdGFmaWxlLCBmaWx0ZXIpIHtcclxuXHRjb25zdCBzMyA9IG5ldyBhd3MuUzMoKTtcclxuXHJcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+XHJcblx0XHR7XHJcblx0XHRcdGNvbnN0IHBhcnNlciA9IGNzdl9wYXJzZXIoeyBjb2x1bW5zIDogdHJ1ZSwgb2JqZWN0TW9kZSA6IHRydWUgfSk7XHJcblx0XHRcdHBhcnNlci5waXBlKGZpbHRlcik7XHJcblx0XHRcdGZpbHRlci5vbignZGF0YScsIHJlc29sdmUpO1xyXG5cclxuXHRcdFx0Y2FjaGUud3JpdGUoZGF0YWZpbGUsIHBhcnNlciwgKCkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IHMzcyA9IHMzLmdldE9iamVjdCh7QnVja2V0Oid0Zm5zdy1ndGZzJyxLZXk6ZGF0YWZpbGV9KS5jcmVhdGVSZWFkU3RyZWFtKCk7XHJcblx0XHRcdFx0Ly8gU3RyZWFtQ2F0Y2hlciB3aWxsIGFkZCBhcyBtYW55IGxpc3RlbmVycyB0byB0aGlzIHN0cmVhbSBhcyB0aGVpciBhcmUgY2FjaGUgY2xpZW50c1xyXG5cdFx0XHRcdC8vIEhpZ2ggZW5kIG51bWJlciBvYnNlcnZlZCBpcyBhbiBldmVudCBhZmZlY3RpbmcgMjAtMzAgc3RhdGlvbnNcclxuXHRcdFx0XHRzM3Muc2V0TWF4TGlzdGVuZXJzKDUwKTtcclxuXHRcdFx0XHRjYWNoZS5yZWFkKGRhdGFmaWxlLCBzM3MpO1xyXG5cdFx0XHR9KVxyXG5cdH0pXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFJvdXRlKHJvdXRlX2lkKSB7XHJcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuXHRcdGdldEVudGl0eUZyb21EYihcclxuXHRcdFx0XCJyb3V0ZXMudHh0XCIsIFxyXG5cdFx0XHRmaWx0ZXIoeyBvYmplY3RNb2RlIDogdHJ1ZSB9LCBmdW5jdGlvbihjaHVuaykgeyByZXR1cm4gY2h1bmsucm91dGVfaWQgPT0gcm91dGVfaWQgfSlcclxuXHRcdClcclxuXHRcdFx0LnRoZW4oKHJvdXRlKSA9PiByZXNvbHZlKHJvdXRlLnJvdXRlX3Nob3J0X25hbWUpKVxyXG5cdFx0fSlcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0VHJpcCh0cmlwX2lkKSB7XHJcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuXHRcdGdldEVudGl0eUZyb21EYihcclxuXHRcdFx0XCJ0cmlwcy50eHRcIiwgXHJcblx0XHRcdGZpbHRlcih7IG9iamVjdE1vZGUgOiB0cnVlIH0sIGZ1bmN0aW9uKGNodW5rKSB7IHJldHVybiBjaHVuay50cmlwX2lkID09IHRyaXBfaWQgfSlcclxuXHRcdClcclxuXHRcdFx0LnRoZW4oKHRyaXApID0+IHJlc29sdmUodHJpcC50cmlwX2hlYWRzaWduKSlcclxuXHRcdH0pXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFN0b3Aoc3RvcF9pZCkge1xyXG5cdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcblx0XHRnZXRFbnRpdHlGcm9tRGIoXHJcblx0XHRcdFwic3RvcHMudHh0XCIsIFxyXG5cdFx0XHRmaWx0ZXIoeyBvYmplY3RNb2RlIDogdHJ1ZSB9LCBmdW5jdGlvbihjaHVuaykgeyByZXR1cm4gY2h1bmsuc3RvcF9pZCA9PSBzdG9wX2lkIH0pXHJcblx0XHQpXHJcblx0XHRcdC50aGVuKChzdG9wKSA9PiByZXNvbHZlKHN0b3Auc3RvcF9uYW1lKSlcclxuXHRcdH0pXHJcbn1cclxubW9kdWxlLmV4cG9ydHMgPSB7IGdldEdURlNTY2hlbWEsIGdldFRyYWluc1N0YXR1cywgcHJvY2Vzc0ZlZWRNZXNzYWdlLCBwYXJzZUdURlMsIGdldEVudGl0eU5hbWUsIGdldEVudGl0eSB9XHJcbiJdfQ==