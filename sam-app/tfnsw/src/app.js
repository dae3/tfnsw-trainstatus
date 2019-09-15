'use strict';
require('dotenv').config();
const gtfs = require('./gtfs.js');
import { merge, from } from 'rxjs';
import { first, filter, map, mergeAll } from 'rxjs/operators';
const { print, stringify } = require('q-i');
const aws = require('aws-sdk');

exports.handler = async function(event, context) {
  var response = [];

  filtered_alerts().subscribe(
    response.push,
    () => {
      return new Promise((resolve, reject) => {
        resolve(null, { 'body' : response })
      })
    },
  )
}

const filtered_alerts = function(schema) {
  const alerts = 
    from(gtfs.getTrainsStatus()).pipe(
      map(raw => gtfs.parseGTFS(raw.body)),
      map(cooked => schema.FeedMessage.read(cooked).entity),
      mergeAll(),
    )

  const f_alerts = merge(
    alerts.pipe( filter(stop_filter('278210') ) ),
    alerts.pipe( filter(stop_filter('2782181') ) ),
    alerts.pipe( filter(stop_filter('2782182') ) ),
    alerts.pipe( filter(stop_filter('200060') ) ),
    alerts.pipe( filter(stop_filter('206520') ) ),
    alerts.pipe( filter(route_filter('BMT_1') ) ),
    alerts.pipe( filter(route_filter('BMT_2') ) ),
    alerts.pipe( filter(route_filter('WST_1a') ) ),
    alerts.pipe( filter(route_filter('WST_1b') ) ),
    alerts.pipe( filter(route_filter('WST_2c') ) ),
    alerts.pipe( filter(route_filter('WST_2d') ) ),
    alerts.pipe( filter(trip_filter('W512') ) ),
    alerts.pipe( filter(trip_filter('W579') ) )
	);

	return alerts;
}

const sqs = new aws.SQS({ region: 'ap-southeast-2' });
const outf = require('fs').createWriteStream('./events.json');
gtfs.getGTFSSchema().then(schema => {
	filtered_alerts(schema).pipe(map(JSON.stringify), first()).subscribe(print);
// 	sqs.getQueueUrl( { QueueName: 'tfnsw' } , (err, data) => {
// 		if (err) { console.log(err) }
// 		else
// 		{
// 			filtered_alerts(schema).subscribe(alert => {
// 				sqs.sendMessage({
// 					MessageBody: JSON.stringify(alert),
// 					QueueUrl: data.QueueUrl
// 				}, print)
// 			})
// 		}
// 	})
})

function queueMessageCreator(alert, qurl) {
	return {
		QueueUrl: data.QueueUrl,
					MessageBody: JSON.stringify(alert),


	}
}

function stop_filter(id) {
  return (entity) => entity.alert.informed_entity.map(i=>i.stop_id).includes(id)
}
function route_filter(id) {
  return (entity) => entity.alert.informed_entity.map(i=>i.route_id).includes(id)
}
function trip_filter(id) {
  return (entity) => entity.alert.informed_entity.trip && entity.alert.informed_entity.map(i=>i.trip.trip_id.slice(0, trip_id.indexOf('.')-1)).includes(id)
}
