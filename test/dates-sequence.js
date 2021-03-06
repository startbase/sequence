"use strict";

process.env.RUN = false;

const assert = require('chai').assert;
let Worker = require('../worker');

let actions = [
    {datetime:"2017-12-01 10:00:01", action: "action_0"},
    {datetime:"2017-12-01 10:01:02", action: "action_1"},
    {datetime:"2017-12-01 10:02:03", action: "action_3"},
    {datetime:"2017-12-01 10:03:04", action: "action_2"},
    {datetime:"2017-12-01 10:04:05", action: "action_5"},
    {datetime:"2017-12-01 10:05:06", action: "action_6"},
    {datetime:"2017-12-01 10:06:06", action: "action_7"}
];

describe('Dates sequence checks', function () {
    Worker = new Worker();

    it('preparing ', function () {
        let rules = [
            {rule: "any"},
            {rule: "equal", action_key: "action_1", date_start:"2017-01-01", date_end:"2018-01-01"},
            {rule: "any"},
            {rule: "equal", action_key: "action_2", previuos_action_time: 3600},
            {rule: "any"},
            {rule: "equal", action_key: "action_0",  date_start:"2017-01-01 15:51:15", date_end:"2018-01-01 13:31:13"}
        ];

        let expect = [
            {rule: "any"},
            {rule: "equal", action_key: "action_1", date_start:1483228800000, date_end:1514840399999},
            {rule: "any"},
            {rule: "equal", action_key: "action_2", previuos_action_time: 3600000},
            {rule: "any"},
            {rule: "equal", action_key: "action_0",  date_start:1483275075000, date_end:1514802673000}
        ];

        assert.deepEqual(expect, Worker.prepareRules(rules, actions));
    });

    it('Zero sequences date borders', function () {
        let rules = [
            {rule: "any"},
            {
                rule: "equal",
                action_key: "action_1",
                date_start:"2017-12-01 10:00:05",
                date_end:"2017-12-01 10:00:10"
            },
        ];

        assert.equal(0, Worker.check_sequence(rules, actions));
    });

    it('Zero sequences date interval', function () {
        let rules = [
            {rule: "any"},
            {
                rule: "equal",
                action_key: "action_2",
                previuos_action_time: 3600
            }
        ];

        assert.equal(0, Worker.check_sequence(rules, actions));
    });

    it('Single sequence', function () {
        let rules = [
            {rule: "any"},
            {
                rule: "equal",
                action_key: "action_2"
            }
        ];

        assert.equal(1, Worker.check_sequence(rules, actions));
    });

});