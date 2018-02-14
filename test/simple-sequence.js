let assert = require('assert');

let Worker = require('../worker');

let actions = [
    {action: "action_0"},
    {action: "action_1"},
    {action: "action_3"},
    {action: "action_2"},
    {action: "action_5"},
    {action: "action_5"}
];

describe('Simple sequence checks', function () {
        Worker = new Worker();

        it('Any => Action 1 => Any => Action 2 => Any', function () {
            let rules = [
                {rule: "any"},
                {rule: "equal", action_key: "action_1"},
                {rule: "any"},
                {rule: "equal", action_key: "action_2"}
            ];

            assert.equal(1, Worker.check_sequence(rules, actions));
        });

        it('Action 0 => Any => Action 2 => Any => Action 5', function () {
            let rules = [
                {rule: "equal", action_key: "action_0"},
                {rule: "any"},
                {rule: "equal", action_key: "action_2"},
                {rule: "any"},
                {rule: "equal", action_key: "action_5"}
            ];

            assert.equal(1, Worker.check_sequence(rules, actions));
        });

        it('Any => Action 1 => Action 3 => Action 2', function () {
            let rules = [
                {rule: "any"},
                {rule: "equal", action_key: "action_1"},
                {rule: "equal", action_key: "action_3"},
                {rule: "equal", action_key: "action_2"},
            ];

            assert.equal(1, Worker.check_sequence(rules, actions));
        });

        it('Any => Action 10 => Action 3 => Action 2', function () {
            let rules = [
                {rule: "any"},
                {rule: "equal", action_key: "action_10"},
                {rule: "equal", action_key: "action_3"},
                {rule: "equal", action_key: "action_2"},
            ];

            assert.equal(0, Worker.check_sequence(rules, actions));
        });

        it('Any => Action 0 => Action 3 => Action 2', function () {
            let rules = [
                {rule: "any"},
                {rule: "equal", action_key: "action_0"},
                {rule: "equal", action_key: "action_3"},
                {rule: "equal", action_key: "action_2"},
            ];

            assert.equal(0, Worker.check_sequence(rules, actions));
        });

        it('Any => Action 0', function () {
            let rules = [
                {rule: "any"},
                {rule: "equal", action_key: "action_5"}
            ];

            assert.equal(1, Worker.check_sequence(rules, actions));
        });
});