'use strict';
require('dotenv').config();
const gtfs = require('./gtfs.js');
import { from, forkJoin, interval } from 'rxjs';
import { concatMapTo, catchError, map, mergeAll, take, filter, tap } from 'rxjs/operators';
const aws = require('aws-sdk');
const sqs = new aws.SQS( { region : 'ap-southeast-2' });

exports.handler = function() {
	const qurl = from(sqs.getQueueUrl( { QueueName: 'tfnsw' }).promise());
	const schema = from(gtfs.getGTFSSchema());

	const test_timer = interval(30000).pipe(take(1));
	const prod_timer = interval(0, 1000 * 60 * 30).pipe( filter(function(x) {
		const DoW = [1,2,3,4,5];
		const HoD = [4,5,6,7,17,18,19,20];
		const now = new Date();
		return DoW.includes(now.getDay()) && HoD.includes(now.getHours())
	})
	)
	const timer = interval(1).pipe(take(1));

	forkJoin({ schema : schema, qurl : qurl }).subscribe( ({ schema, qurl }) => {
		console.log('fj');
		timer.pipe(
			tap(console.log('t')),
			concatMapTo(from(gtfs.getTrainsStatus())),
			map(raw => gtfs.parseGTFS(raw.body)),
			map(cooked => schema.FeedMessage.read(cooked).entity),
			mergeAll(),
			map(JSON.stringify),
			map(alert => from(publishToQueue(alert, qurl.QueueUrl)) ),
			tap(console.log('q')),
			mergeAll(),
			catchError(console.log)
		).subscribe({
			count : 0,
			next(v) { this.count++; console.log('sub next') },
			error() { console.log('sub error') },
			complete() { console.log(`Pushed ${this.count} alerts to queue`) }
		})
	})
}

const publishToQueue = (alert, qurl) => sqs.sendMessage( { MessageBody : alert, QueueUrl : qurl } ).promise();

exports.handler();
