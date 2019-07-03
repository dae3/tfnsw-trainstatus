const assert = require('assert');
const should = require('should');
const sinon = require('sinon');
require('../app.js');

describe('tfnsw-sydneytrains', function() {
	describe('gtfs fetch', function() {
		it('should pass', function() {
			assert.equal(1,1);
		});
		
		it('should return a non-zero-length string', function() {
			getGTFSSchema().should.not.equal('');
		});
	});
	



});
