"use strict";

process.env.RUN = false;

const assert = require('chai').assert;
const Worker = require('../worker');

describe('Worker. Test prepare keys function', function () {

	it('Normal keys', function () {
		/** @type {Array} */
		let keys = [
			{"values":["100","101","5000"], "delimiter":"_", "position":0},
			{"values":["101","102","2000","2001"], "delimiter":"_", "position":1},
		];

		/** @type {Map} */
		let needed_keys = new Map([
			['100', new Set([0])],
			['5000', new Set([0])],
			['101', new Set([0, 1])],
			['102', new Set([1])],
			['2000', new Set([1])],
			['2001', new Set([1])]
		]);
		/** @type {{needed_keys: Map, delimeters: Set}} */
		let expected = { needed_keys: needed_keys, delimeters: new Set(['_']) };

		assert.deepEqual(expected, Worker.prepareKeys(keys));
	});

	it('Only one key', function () {
		/** @type {Array} */
		let keys = [
			{"values":["100","101","5000"], "delimiter":"_", "position":0},
		];

		/** @type {Map} */
		let needed_keys = new Map([
			['100', new Set([0])],
			['101', new Set([0])],
			['5000', new Set([0])]
		]);
		/** @type {{needed_keys: Map, delimeters: Set}} */
		let expected = { needed_keys: needed_keys, delimeters: new Set(['_']) };

		assert.deepEqual(expected, Worker.prepareKeys(keys));
	});

	it('Without key', function () {
		/** @type {Array} */
		let keys = [];
		/** @type {{needed_keys: Map, delimeters: Set}} */
		let expected = { needed_keys: new Map(), delimeters: new Set() };

		assert.deepEqual(expected, Worker.prepareKeys(keys));
	});

	it('Invalid key with many delimiters', function () {
		/** @type {Array} */
		let keys = [
			{"delimiter":"_", "position":0},
			{"values":["101","102","2000","2001"], "delimiter":"_"},
			{"values":["302","4000"], "delimiter":"_", "position":1},
			{"values":["502","4000"], "delimiter":"@", "position":1},
		];
		/** @type {Map} */
		let needed_keys = new Map([
			['302', new Set([1])],
			['502', new Set([1])],
			['4000', new Set([1])]
		]);
		/** @type {{needed_keys: Map, delimeters: Set}} */
		let expected = { needed_keys: needed_keys, delimeters: new Set(['_', '@']) };

		assert.deepEqual(expected, Worker.prepareKeys(keys));
	});

});

describe('Worker. Test divide dataset key function', function () {

	it('Delimiter: - and _', function () {
		/** @type {Array} */
		let expected = [
			['1000', '2000_12313', '21312'],
			['1000-2000', '12313-21312']
		];

		assert.deepEqual(expected, Worker.divideDatasetKey('1000-2000_12313-21312', new Set(['-', '_'])));
	});

	it('Without delimiter', function () {
		assert.deepEqual(['1000-2000_12313-21312'], Worker.divideDatasetKey('1000-2000_12313-21312', new Set()));
	});

	it('Delimiter not found in dataset', function () {
		assert.deepEqual([], Worker.divideDatasetKey('1000-2000_12313-21312', new Set(['@'])));
	});

});

describe('Worker. Test is matched dataset function', function () {

	it('Case 1 - not matched', function () {
		/** @type {Array} */
		let dataset_keys = [
			['1000', '2000_12313', '21312'],
			['1000-2000', '12313-21312']
		];
		/** @type {Map} */
		let needed_keys = new Map([
			['100', new Set([0])],
			['101', new Set([0])],
			['5000', new Set([0])]
		]);

		assert.equal(false, Worker.isMatchedDataset(dataset_keys, needed_keys));
	});

	it('Case 2 - matched', function () {
		/** @type {Array} */
		let dataset_keys = [
			['100', '101', '102'],
			['103', '104']
		];
		/** @type {Map} */
		let needed_keys = new Map([
			['100', new Set([1])],
			['101', new Set([0])],
			['104', new Set([1])],
			['5000', new Set([0])]
		]);

		assert.equal(true, Worker.isMatchedDataset(dataset_keys, needed_keys));
	});

});