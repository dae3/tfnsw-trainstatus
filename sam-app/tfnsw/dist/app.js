'use strict';

var _rxjs = require("rxjs");

var _operators = require("rxjs/operators");

require('dotenv').config();

const request = require('request-promise-native');

const gtfs = require('./gtfs.js');

const {
  print,
  stringify
} = require('q-i');

const aws = require('aws-sdk');

exports.handler = async function (event, context) {
  var response = [];
  filtered_alerts().subscribe(response.push, () => {
    return new Promise((resolve, reject) => {
      resolve(null, {
        'body': response
      });
    });
  });
};

const filtered_alerts = function () {
  (0, _rxjs.from)(gtfs.getGTFSSchema()).subscribe(schema => {
    const alerts = (0, _rxjs.from)(gtfs.getTrainsStatus()).pipe((0, _operators.mergeAll)(), (0, _operators.map)(raw => gtfs.parseGTFS(raw.body)), (0, _operators.map)(cooked => schema.FeedMessage.read(cooked).entity), (0, _operators.mergeAll)());
    const user_all = (0, _rxjs.merge)(alerts.pipe((0, _operators.filter)(stop_filter('278210'))), alerts.pipe((0, _operators.filter)(stop_filter('2782181'))), alerts.pipe((0, _operators.filter)(stop_filter('2782182'))), alerts.pipe((0, _operators.filter)(stop_filter('200060'))), alerts.pipe((0, _operators.filter)(stop_filter('206520'))), alerts.pipe((0, _operators.filter)(route_filter('BMT_1'))), alerts.pipe((0, _operators.filter)(route_filter('BMT_2'))), alerts.pipe((0, _operators.filter)(route_filter('WST_1a'))), alerts.pipe((0, _operators.filter)(route_filter('WST_1b'))), alerts.pipe((0, _operators.filter)(route_filter('WST_2c'))), alerts.pipe((0, _operators.filter)(route_filter('WST_2d'))), alerts.pipe((0, _operators.filter)(trip_filter('W512'))), alerts.pipe((0, _operators.filter)(trip_filter('W579'))));
    return alerts.pipe((0, _operators.flatMap)(alert_formatter));
  });
};

function alert_formatter(entity) {
  return (0, _rxjs.from)(new Promise(function (resolve, reject) {
    var entities = entity.alert.informed_entity.map(gtfs.getEntityName);
    Promise.all(entities).then(ea => {
      resolve({
        'title': entity.alert.header_text.translation[0].text + ' (' + ea.filter((e, i, a) => i == 0 ? true : !a.slice(0, i).includes(e)).reduce((a, v, i) => a + (i > 0 ? ', ' : '') + v, '') + ')',
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
  return entity => entity.alert.informed_entity.map(i => i.stop_id).includes(id);
}

function route_filter(id) {
  return entity => entity.alert.informed_entity.map(i => i.route_id).includes(id);
}

function trip_filter(id) {
  return entity => entity.alert.informed_entity.trip && entity.alert.informed_entity.map(i => i.trip.trip_id.slice(0, trip_id.indexOf('.') - 1)).includes(id);
}