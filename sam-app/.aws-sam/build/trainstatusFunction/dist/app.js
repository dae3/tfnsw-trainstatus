'use strict';

var _rxjs = require("rxjs");

var _operators = require("rxjs/operators");

require('dotenv').config();

var request = require('request-promise-native');

var gtfs = require('./gtfs.js');

var _require = require('q-i'),
    print = _require.print,
    stringify = _require.stringify;

var aws = require('aws-sdk');

exports.handler = function (event, context, callback) {
  // context.callbackWaitsForEmptyEventLoop = false
  (0, _rxjs.from)(gtfs.getGTFSSchema()).subscribe(function (schema) {
    var alerts = (0, _rxjs.timer)(100).pipe((0, _operators.mapTo)((0, _rxjs.from)(gtfs.getTrainsStatus())), (0, _operators.mergeAll)(), (0, _operators.map)(function (raw) {
      return gtfs.parseGTFS(raw.body);
    }), (0, _operators.map)(function (cooked) {
      return schema.FeedMessage.read(cooked).entity;
    }), (0, _operators.mergeAll)());
    var user_all = (0, _rxjs.merge)(alerts.pipe((0, _operators.filter)(stop_filter('278210'))), alerts.pipe((0, _operators.filter)(stop_filter('2782181'))), alerts.pipe((0, _operators.filter)(stop_filter('2782182'))), alerts.pipe((0, _operators.filter)(stop_filter('200060'))), alerts.pipe((0, _operators.filter)(stop_filter('206520'))), alerts.pipe((0, _operators.filter)(route_filter('BMT_1'))), alerts.pipe((0, _operators.filter)(route_filter('BMT_2'))), alerts.pipe((0, _operators.filter)(route_filter('WST_1a'))), alerts.pipe((0, _operators.filter)(route_filter('WST_1b'))), alerts.pipe((0, _operators.filter)(route_filter('WST_2c'))), alerts.pipe((0, _operators.filter)(route_filter('WST_2d'))), alerts.pipe((0, _operators.filter)(trip_filter('W512'))), alerts.pipe((0, _operators.filter)(trip_filter('W579'))));
    alerts.pipe((0, _operators.flatMap)(alert_formatter)).subscribe(function (r) {
      return callback(null, r);
    }, function (err) {
      return callback(err, null);
    });
  });
};

function alert_formatter(entity) {
  return (0, _rxjs.from)(new Promise(function (resolve, reject) {
    var entities = entity.alert.informed_entity.map(gtfs.getEntityName);
    Promise.all(entities).then(function (ea) {
      resolve({
        'title': entity.alert.header_text.translation[0].text + ' (' + ea.filter(function (e, i, a) {
          return i == 0 ? true : !a.slice(0, i).includes(e);
        }).reduce(function (a, v, i) {
          return a + (i > 0 ? ', ' : '') + v;
        }, '') + ')',
        'message': entity.alert.description_text.translation[0].text,
        'link': entity.alert.url.translation[0].text
      });
    });
  }));
}

function entity_id(entity) {
  if (entity.trip) {
    return entity.trip;
  } else if (entity.stop_id != '') {
    return entity.stop_id;
  } else if (entity.route_id != '') {
    return entity.route_id;
  } else {
    return 'unknown';
  }
}

function stop_filter(id) {
  return function (entity) {
    return entity.alert.informed_entity.map(function (i) {
      return i.stop_id;
    }).includes(id);
  };
}

function route_filter(id) {
  return function (entity) {
    return entity.alert.informed_entity.map(function (i) {
      return i.route_id;
    }).includes(id);
  };
}

function trip_filter(id) {
  return function (entity) {
    return entity.alert.informed_entity.trip && entity.alert.informed_entity.map(function (i) {
      return i.trip.trip_id.slice(0, trip_id.indexOf('.') - 1);
    }).includes(id);
  };
}