"use strict";

process.env.RUN = false;

let assert = require('assert');
let Worker = require('../worker');

let actions = [
    {datetime:"2017-12-01 10:00:01", action: "action_0"},
    {datetime:"2017-12-01 10:00:02", action: "action_1"},
    {datetime:"2017-12-01 10:00:03", action: "action_3"},
    {datetime:"2017-12-01 10:00:04", action: "action_2"},
    {datetime:"2017-12-01 10:00:05", action: "action_5"},
    {datetime:"2017-12-01 10:00:06", action: "action_5"}
];

describe('Dates sequence checks', function () {
    Worker = new Worker();
    it('Any => Action 1 => Any => Action 2 => Any', function () {
        let rules = [
            {rule: "any"},
            {rule: "equal", action_key: "action_1", date_start:"2017-01-01", date_end:"2018-01-01"},
            {rule: "any"},
            {rule: "equal", action_key: "action_2", previuos_action_time: 3600 * 1000} //previuos_action_time - microseconds
        ];

        assert.equal(1, Worker.check_sequence(rules, actions));
    });

});