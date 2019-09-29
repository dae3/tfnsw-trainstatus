const aws = require('aws-sdk');
const s3 = new aws.S3();
const sns = new aws.SNS( { region : 'ap-southeast-2' });
const parser = require('csv-parser');

exports.handler = async (event) => {

	const db = new Map([
		[ 'routes.txt', { transform : (data) => [data.route_id, data.route_desc], filter: (data) => true }],
		[ 'stops.txt', {
			transform : (data) => [data.stop_id, data.stop_name],
			filter : (data) => !data.stop_name.includes('Platform')  // exclude Platform stops, they add massive qty and never seem to get used anyway
		} ],
		[ 'trips.txt', {
			transform : (data) => [data.trip_id.replace(/\./g,'_'), data.trip_headsign], // remove invalid SNS topic characters
			filter : (data) => true
		} ]
	]);

	const updateDate = new Date();

	return Promise.all(event.Records.map(r => {
		if (db.has(r.s3.object.key)) {

			console.log(`Updating topics for ${r.s3.object.key}`);

			const { transform, filter } = db.get(r.s3.object.key);
			const topics = [];
			topics.push(new Promise((r,j) => setTimeout(r, 5000))); // hacky

			s3.getObject( { Bucket : r.s3.bucket.name, Key : r.s3.object.key } )
				.createReadStream().pipe(parser())
				.on('data', data => {
					if (filter(data)) {
						const [name, title] = transform(data);
						console.log(title);
						topics.push(sns.createTopic( {
							Name : name,
							Attributes : { DisplayName : title	},
							Tags : [ { Key : 'Updated', Value : updateDate.valueOf().toString() } ]
						}).promise());
					}
				})

			//return Promise.all(topics).then(t => topicCleanup(t.map(to=>to.TopicArn), sns))
			return Promise.all(topics);

		} else {
			// TODO warn log
			console.log(`Unknown topic key ${r.s3.object.key}`);
			return Promise.resolve(`Unknown topic key ${r.s3.object.key}`);
		}
	}))
}

function topicCleanup(newtopics, sns) {

	const delPromises = [];

	const cb = (err, data) => {
		if (!err) {
			if (data.NextToken) { 
				sns.listTopics({ NextToken : data.NextToken }, cb);
			} else {
				//TODO warn
			}

			delPromises.push(
				data.Topics
				.map(topic => sns.deleteTopic(topic).promise())
			)
		}
	}

	sns.listTopics({}, cb);
	return Promise.all(delPromises);
}

