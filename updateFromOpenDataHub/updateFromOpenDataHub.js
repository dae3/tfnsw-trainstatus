'use strict';
const aws = require('aws-sdk');
const jszip = require('jszip');
const request = require('request-promise-native');
const s3 = new aws.S3();
const secrets = new aws.SecretsManager( { region : 'ap-southeast-2' } )
require('dotenv').config();

exports.handler = async (event) => {
	const zip = new jszip();
	const s3Uploads = [];

	console.log('Fetching GTFS protobuf schema');
	const gtfs = await request('https://developers.google.com/transit/gtfs-realtime/gtfs-realtime.proto')
	await s3.upload({ Bucket : `${process.env.TFNSW_PREFIX}-${process.env.TFNSW_ENV}-gtfs`, Key : 'gtfs-realtime.proto', Body : gtfs } )

	console.log('Getting API key from SecretsManager')
	const secretData = await secrets.getSecretValue( { SecretId : `${process.env.TFNSW_PREFIX}-${process.env.TFNSW_ENV}-tfnsw_apikey` } ).promise()

	return new Promise((resolve, reject) => {
		console.log('Fetching GTFS schedule data');
		request({
			uri : 'https://api.transport.nsw.gov.au/v1/gtfs/schedule/sydneytrains',
			encoding : null,
			headers : { 'Authorization' : `apikey ${secretData.SecretString}` } 
		})
			.then(body => zip.loadAsync(body))
			.then((gtfsdata) => {
				console.log('Processing GTFS schedule data');
				gtfsdata.forEach((relativePath, file) => {
					switch(file.name) {
						case 'routes.txt':
						case 'trips.txt':
						case 'stops.txt':
							console.log(`Got schedule file ${file.name}`);
							s3Uploads.push(s3.upload( { Bucket : `${process.env.TFNSW_PREFIX}-${process.env.TFNSW_ENV}-gtfs`, Key : file.name, Body : file.nodeStream() }).promise());
							break;
						default:
							break;
					}
				})
				Promise.all(s3Uploads).then(resolve);
			})
	})
}
