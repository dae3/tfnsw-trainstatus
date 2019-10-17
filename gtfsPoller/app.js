'use strict';
require('dotenv').config();
const gtfs = require('./gtfs.js');
const fs = require('fs');
import { from, forkJoin, timer } from 'rxjs';
import { retry, distinct, concatMapTo, catchError, map, mergeAll, take, filter, tap } from 'rxjs/operators';
const aws = require('aws-sdk');
const sqs = new aws.SQS( { region : 'ap-southeast-2' });

exports.handler = function() {
	const qurl = from(sqs.getQueueUrl(
		{ QueueName: `${process.env.TFNSW_PREFIX}-${process.env.TFNSW_ENV}-input_queue` }
	).promise());
	const schema = from(gtfs.getGTFSSchema());

	const once_timer = timer(0, 1).pipe(take(1));
	const test_timer = timer(0, 10000).pipe(take(3));
	const prod_timer = timer(0, 1000 * 60 * 10).pipe( filter(function(x) {
		const DoW = [1,2,3,4,5];
		const HoD = [4,5,6,7,16,17,18,19,20];
		const now = new Date();
		const run =  DoW.includes(now.getDay()) && HoD.includes(now.getHours())
		console.log(`Timer ${run ? 'run' : 'skipped'}`);
		return run;
	})
	)
	const flush_timer = timer(0, 1000 * 60 * 60 * 24);
	const alert_timer = prod_timer;

	const emitHandler = function( { schema, qurl } ) {
			alert_timer.pipe(
				tap(t => console.log(`Checking alert feed iteration ${t}`)),
				concatMapTo(from(gtfs.getTrainsStatus())),
				map(raw => gtfs.parseGTFS(raw.body)),
				map(cooked => schema.FeedMessage.read(cooked).entity),
				mergeAll(),
				distinct(alert => alert.id, flush_timer), 
				map(JSON.stringify),
				map(alert => from(publishToQueue(alert, qurl.QueueUrl)) ),
				mergeAll(),
			).subscribe(
				{
					log : fs.createWriteStream('./tfnsw.log', { flags : 'a' }),
					next(v) { console.log(v); this.log.write(v.toString()); },
					error(v) { console.log(v); this.log.write(v.toString()); },
					complete() { this.log.end('done'); }
				}
			)
		}

	const errHandler = function(err) { console.log(`HERE ${err}`) }

	forkJoin({ schema : schema, qurl : qurl }).subscribe(emitHandler, errHandler)

const publishToQueue = (alert, qurl) => sqs.sendMessage( { MessageBody : alert, QueueUrl : qurl } ).promise();
}

exports.handler();
