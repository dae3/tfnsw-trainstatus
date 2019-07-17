'use strict';
require('dotenv').config();
import { interval } from 'rxjs';

exports.status = function(req, res) {
	if (req.method == 'GET' && req.query.line) {
		st = getTrainsStatus();
		st.on('end', () => res.status(200).end());
		st.pipe(res);
	} else {
		res.status(400).end('bad request');
	} 
}

interval(10000).subscribe(n => console.log('.'));
