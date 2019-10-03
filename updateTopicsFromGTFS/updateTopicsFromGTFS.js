const aws = require('aws-sdk');
const s3 = new aws.S3();
const sns = new aws.SNS( { region : 'ap-southeast-2' });
const parse = require('csv-parse');
const streamFilter = require('through2-filter');
var Bottleneck = require("bottleneck/es5");
const rateLimiter = new Bottleneck( { minTime : 33 } ); // API limit is 30 transactions/second

exports.handler = async (event) => {

  const db = new Map([
    [ 'routes.txt', { transform : (data) => ['route_'+data.route_id, data.route_desc], filter: (data) => true }],
    [ 'stops.txt', {
      transform : (data) => ['stop_'+data.stop_id, data.stop_name],
      filter : (data) => !data.stop_name.parent_station != ""  // exclude Platform stops, they add massive qty and never seem to get used anyway
    } ],
    [ 'trips.txt', {
      transform : (data) => ['trip_'+data.trip_id.replace(/\./g,'_'), data.trip_headsign], // remove invalid SNS topic characters
      filter : (data) => !( ['RTTA_REV','RTTA_DEF'].includes(data.route_id) || data.trip_id.match(/^8[89][0-9]/) ) // exclude charter and non-customer svcs
    } ]
  ]);

  return Promise.all(event.Records.map(r => {
    if (db.has(r.s3.object.key)) {

      console.log(`Updating topics for ${r.s3.object.key}`);

      return new Promise((resolve, reject) => {
        const { transform, filter } = db.get(r.s3.object.key);
        const topics = [];
        const parser = parse( { delimiter : ',', columns : true } );

        s3.getObject( { Bucket : r.s3.bucket.name, Key : r.s3.object.key } ).createReadStream()
          .pipe(parser)
          .pipe(streamFilter.obj(filter))
          .on('data', (chunk) => {
            const [name, title] = transform(chunk);
            topics.push(rateLimiter.schedule( () => sns.createTopic( { Name : name, Attributes : { DisplayName : title } }).promise() ));
          })
          .on('end', () => resolve(Promise.all(topics)))
          .on('error', (err) => reject(err));
      })

    } else {
      return Promise.reject(`Unknown topic key ${r.s3.object.key}`);
    }
  }))
}

// head recursive fetch, filter, and delete topics, with rate limiting
//  topicFilter receives Array of { TopicArn : <arn> }
async function deleteTopics(topicFilter, sns, nextToken) {
  const topics = await sns.listTopics( nextToken ? { NextToken : nextToken } : {} ).promise();
  if (topics.NextToken) {
    return topics.Topics
      .filter(topicFilter)
      .map(topic => rateLimiter.schedule(() => sns.deleteTopic(topic).promise()))
      .concat(await deleteTopics(topicFilter, sns, topics.NextToken))
  } else {
    return topics.Topics
      .filter(topicFilter)
      .map(topic => rateLimiter.schedule(() => sns.deleteTopic(topic).promise()))
  }
}

const getResourceIdFromArn = (arn) => {
  const arnElements = arn.split(':');
  if (arnElements[5].includes(':')) {
    return arnElements[5].split(':')[1]
  } else if (arnElements[5].includes('/')) {
    return arnElements[5].split('/')[1]
  } else {
    return arnElements[5]
  }
}

const routeTopicFilter = (topic) => getResourceIdFromArn(topic.TopicArn).startsWith('route_')
const tripTopicFilter = (topic) =>  getResourceIdFromArn(topic.TopicArn).startsWith('trip_') 
const stopTopicFilter = (topic) =>  getResourceIdFromArn(topic.TopicArn).startsWith('stop_') 

//deleteTopics(stopTopicFilter, sns).then(console.log)

const ev = { Records : [ { s3 :  {
  object : { key : 'trips.txt' },
  bucket : { name : 'tfnsw-gtfs' }
} } ] }
exports.handler(ev).then(console.log).catch(`error: ${console.log}`)
