// const proto = require('pbf');
// const protocomp = require('pbf/compile');
// const protoschema = require('protocol-buffers-schema');
// const { print, stringify } = require('q-i');
const aws = require('aws-sdk');
const zip = require('node-stream-zip');
const https = require('https');
const tempy = require('tempy');
const fs = require('fs');
const s3 = new aws.S3();

exports.handler = async (event) => {
  console.log('start');
  const response = await promisedReqStream(
    'https://api.transport.nsw.gov.au/v1/gtfs/schedule/sydneytrains'
  );
  console.log(response.statusCode);

  const zipfile = tempy.file({ extension : 'zip'});
  response.pipe(fs.createWriteStream(zipfile));

  var s3Uploads = [];
  // slightly hacky approach to ensure at least 1 s3 upload gets added
  //  to s3Uploads before the function falls through
  s3Uploads.push(new Promise((resolve, reject) => { setTimeout(resolve, 2000) }));

  response.on('end', () => {
    const data = new zip({ file : zipfile });
    data.on('entry', entry => {
      console.log(entry.name);
      const entryStream = data.stream(entry, (err, stream) =>
        {
          switch(entry.name) {
            case 'routes.txt':
            case 'trips.txt':
            case 'stops.txt':
              s3Uploads.push(s3.upload( { Bucket : 'tfnsw-gtfs', Key : entry.name, Body : stream }).promise());
              break;
            default:
              break;
          }
        })
    })
  })

  const allUploadsPromise = Promise.all(s3Uploads);
  console.log('end');
  return allUploadsPromise;
  //data.close();

}

function promisedReqStream(url) {
  return new Promise((resolve, reject) => {
    https.request(url, { headers : { "Authorization" : `apikey ${process.env.TFNSW_API_KEY}` }}, resolve).end();
  })
}

