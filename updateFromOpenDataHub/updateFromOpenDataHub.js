'use strict';
const aws = require('aws-sdk');
const jszip = require('jszip');
const request = require('request-promise-native');
const s3 = new aws.S3();
require('dotenv').config();

exports.handler = async (event) => {
  const zip = new jszip();
  const s3Uploads = [];

  return new Promise((resolve, reject) => {
    console.log('Fetching GTFS schedule data');
    request({
      uri : 'https://api.transport.nsw.gov.au/v1/gtfs/schedule/sydneytrains',
      encoding : null,
      headers : { 'Authorization' : `apikey ${process.env.TFNSW_APIKEY}` } 
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
            Promise.all(s3Uploads).then(resolve);
          })
      })
  })
}
