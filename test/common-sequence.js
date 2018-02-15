"use strict";

process.env.RUN = false;

let assert = require('assert');
let Worker = require('../worker');

describe('Common sequence functions', function () {
    describe('Function Worker.sort_actions_by_date', function () {

        let dates_random = [
            {datetime: '2017-12-01 15:10:10'},
            {datetime: '2017-11-01 15:10:10'},
            {datetime: '2017-12-01 15:12:10'}
        ];
        let dates_asc = [
            {datetime: '2017-11-01 15:10:10'},
            {datetime: '2017-12-01 15:10:10'},
            {datetime: '2017-12-01 15:12:10'}
        ];

        it('Sort dates by asc', function () {
            assert.deepEqual(dates_asc, dates_random.sort(Worker.sort_actions_by_date));
        });
    });
});
