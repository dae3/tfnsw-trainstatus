'use strict';
const aws = require('aws-sdk');
const csv_parser = require('csv-streamify');
const StreamCatcher = require('stream-catcher');
const cache = new StreamCatcher();
const filter = require('through2-filter');
const sns = new aws.SNS( { region : 'ap-southeast-2' });
const TOPIC_PREFIX='arn:aws:sns:ap-southeast-2:717350670811:';

/*
  Lambda handler. event is [ eventobj ]
  eventobj is
  {
	"id": "1",
	"is_deleted": false,
	"trip_update": null,
	"vehicle": null,
	"alert": {
		"active_period": [],
		"informed_entity": [{
			"agency_id": "NSWTrains",
			"route_id": "BMT_2",
			"route_type": 0,
			"trip": null,
			"stop_id": ""
		}, {
			"agency_id": "NSWTrains",
			"route_id": "BMT_1",
			"route_type": 0,
			"trip": null,
			"stop_id": ""
		}],
		"cause": {
			"value": 1,
			"options": {}
		},
		"effect": {
			"value": 8,
			"options": {}
		},
		"url": {
			"translation": [{
				"text": "https://transportnsw.info/alerts#/train",
				"language": "en"
			}]
		},
		"header_text": {
			"translation": [{
				"text": "Blue Mountains Line - Partial Closure",
				"language": "en"
			}]
		},
		"description_text": {
			"translation": [{
				"text": "Train services have been suspended and replaced by buses between Mt Victoria, Lithgow and Bathurst in both directions due to infrastructure damage caused by bushfires. \n\nThere is no forecast when the line can reopen. Please allow additional travel time and check transport apps for further details.",
				"language": "en"
			}]
		}
	}
  }
 */

module.exports.handler = async (event) => {
  const formattedAlerts = event.Records.map(rec=>JSON.parse(rec.body)).map(formatAlert);
  console.log(`${formattedAlerts.length} alerts`);
  for await (const alert of formattedAlerts) {
    console.log(`${alert.correlationId} : ${alert.topics.reduce(topicReducerForLog)} : ${alert.body.title}`);
    Promise.all(
      alert.topics.map(topic => publishToSNS(`${TOPIC_PREFIX}${topic}`, alert.body.title, alert.body.message, alert.correlationId))
    )
      .then(results => results.map(console.log));
  }
};

const topicReducerForLog = (acc, value, idx) => { return(acc + (idx > 0 ? ', ' : ''  + value), '') }

function publishToSNS(topic, title, body, correlationId) {
  return new Promise((resolve, reject) => {
    sns.publish(
      {
        Subject : `${title} (${correlationId})`, 
        MessageStructure : 'json',
        Message : JSON.stringify( { default : body, email : body }),
        TopicArn : topic
      }, 
      (err, data) => {
        if (!err) {
          resolve(`${correlationId} Delivered ${data.MessageId} to ${topic}`);
        } else {
          if (err.code === 'NotFound') {
            resolve(`${correlationId} Topic ${topic} not found`);
          } else {
            resolve(err);
          }
        }
      })
  });
}

function formatAlert(entity) {
  return new Promise((resolve, reject) =>
    {
      var entities = entity.alert.informed_entity.map(getEntityName);
      Promise.all(entities).then(ea => {
        resolve(
          {
            body : {
              title : entity.alert.header_text.translation[0].text + ' (' +
              ea.filter((e,i,a) => i == 0 ? true : !a.slice(0,i).includes(e)).reduce(topicReducerForLog)
              + `)` ,
              message : entity.alert.description_text.translation[0].text + `\n\n${entity.correlationId}`,
              link  : entity.alert.url.translation[0].text,
            },
            topics : entity.alert.informed_entity.map(getEntity)
          }
        )
      })
    })
}

function getEntityName(entity) {
  if (entity.trip) {
    return getTrip(entity.trip.trip_id)
  } else if (entity.stop_id != '') {
    return getStop(entity.stop_id)
  } else if (entity.route_id != '') {
    return getRoute(entity.route_id)
  }
}

function getEntity(entity) {
  if (entity.trip) {
    return `trip_${entity.trip.trip_id}`
  } else if (entity.stop_id) {
    return `stop_${entity.stop_id}`
  } else if (entity.route_id) {
    return `route_${entity.route_id}`
  }
}


function getEntityFromDb(datafile, filter) {
  const s3 = new aws.S3();

  return new Promise((resolve, reject) =>
    {
      const parser = csv_parser({ columns : true, objectMode : true });
      parser.pipe(filter);
      filter.on('data', resolve);

      cache.write(datafile, parser, () => {
        const s3s = s3.getObject({Bucket:`${process.env.TFNSW_PREFIX}-${process.env.TFNSW_ENV}-gtfs`,Key:datafile}).createReadStream();
        // StreamCatcher will add as many listeners to this stream as there are cache clients,
        // ie proportional to number of topics for a single event.
        // The high end number observed is for large scale trackwork affecting most lines 
        s3s.setMaxListeners(100);
        cache.read(datafile, s3s);
        console.log(`cache miss on ${datafile}`);
      })
    })
}

function getRoute(route_id) {
  return new Promise((resolve, reject) => {
    getEntityFromDb(
      "routes.txt", filter({ objectMode : true }, function(chunk) { return chunk.route_id == route_id })
    )
      .then((route) => resolve(route.route_short_name))
  })
}

function getTrip(trip_id) {
  return new Promise((resolve, reject) => {
    getEntityFromDb(
      "trips.txt", 
      filter({ objectMode : true }, function(chunk) { return chunk.trip_id == trip_id })
    )
      .then((trip) => resolve(trip.trip_headsign))
  })
}

function getStop(stop_id) {
  return new Promise((resolve, reject) => {
    getEntityFromDb(
      "stops.txt", 
      filter({ objectMode : true }, function(chunk) { return chunk.stop_id == stop_id })
    )
      .then((stop) => resolve(stop.stop_name))
  })
}
