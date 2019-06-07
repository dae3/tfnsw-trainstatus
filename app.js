const https = require('https');
const TFNSW_API_KEY = 'l7xx61217625406b4aa3ae3c25524f4aa203';
const proto = require('protocol-buffers');

exports.status = (req, res) => {
	if (req.method == 'GET' && req.query.line) {
		st = getTrainsStatus();
		st.on('end', () => res.status(200).end());
		st.pipe(res);
	} else {
		res.status(400).end('bad request');
	} 
};

var gtfs = proto(getGTFSSchema());

function getGTFSSchema() {
	var d = '';
	https.request(
		'https://developers.google.com/transit/gtfs-realtime/gtfs-realtime.proto',
		(res) => {
		if (res.statusCode == 200) {
			res.on('data', (res) => d = res);
			console.log('got GTFS schema');
		}});
	return d;
}

function getTrainsStatus() {
	https.request(
	'https://api.transport.nsw.gov.au/v1/gtfs/alerts/sydneytrains',
		exports.status = (req, res) => {
			if (req.method == 'GET' && req.query.line) {
				st = getTrainsStatus();
				st.on('end', () => res.status(200).end());
				st.pipe(res);
			} else {
				res.status(400).end('bad request');
			} 
		});
}

function sendTriggerToIFTTT(statusArray) {
	var postData = { 'value1' : statusArray[0], 'value2' : statusArray[1] };
	var postOptions = { 
		'method' : 'post',
		'contentType': 'application/json',
		'payload' : JSON.stringify(postData)
	};
//	var trigger = UrlFetchApp.fetch(
//		'https://maker.ifttt.com/trigger/train_status_received/with/key/brp_hwHjO0oMMOCJTmBGDC',
//		postOptions
//	);
}
