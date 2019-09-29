const jszip = require('jszip');
const aws = require('aws-sdk');
const fetch = require('node-fetch');
const s3 = new aws.S3();

exports.handler = async (event) => {
  const zip = new jszip();
  const s3Uploads = [];

  return new Promise((resolve, reject) => {
    console.log('Fetching GTFS schedule data');
    fetch('https://api.transport.nsw.gov.au/v1/gtfs/schedule/sydneytrains', { headers : { 'Authorization' : `apikey ${process.env.TFNSW_API_KEY}` } })
      .then(res => {
        if (res.ok) {
          return res.blob()
        } else {
          return Promise.reject(res.status)
        }
      })
      .then(zip.loadAsync)
      .then((gtfsdata) => {
        console.log('Processing GTFS schedule data');
        gtfsdata.forEach((relativePath, file) => {
          switch(file.name) {
            case 'routes.txt':
            case 'trips.txt':
            case 'stops.txt':
              console.log(`Got schedule file ${file.name}`);
              s3Uploads.push(s3.upload( { Bucket : 'tfnsw-gtfs', Key : entry.name, Body : file.nodeStream() }).promise());
              break;
            default:
              break;
          }
          Promise.all(s3Uploads).then(resolve);
        })
      })
      .catch(err => reject(err));
  })
}
