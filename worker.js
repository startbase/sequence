'use strict';

const http = require('http');

const fs = require('fs');
const readline = require('readline');
const stream = require('stream');
const WebSocketClient = require('./ws-client');

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '127.0.0.1';
const DEBUG = process.env.DEBUG || false;
const APP_SERVER_URL = process.env.APP_SERVER_URL || 'ws://127.0.0.1:8081';
const RUN = process.env.RUN || true;

const DATASET_SEGMENT = 0;
const DATASET_PARTITION = 1;
const DATASET_KEY = 2;
const DATASET_DATETIME = 3;
const DATASET_ACTION = 4;

const RULE_EQUAL = 'equal';
const RULE_ANY = 'any';


class Worker {

    run() {
        let server = http.createServer(this.handler);
        server.listen(PORT, HOST, () => {
            Worker.log('Server listent to: ', HOST, PORT);
        });

        this.runSocket();
    }

    runSocket() {
        let socket = new WebSocketClient(APP_SERVER_URL, 2000, ws => {
            ws.on('message', (raw_data) => {
                let data = JSON.parse(raw_data);
                this.calculateSequence(data, result => {
                    Worker.log('ws recieve', result);
                    socket.send(JSON.stringify(result));
                });
            });
            ws.on('open', () => Worker.log('Socket connected'));
            ws.on('error', (e) => Worker.log('Socket error', e.message));
        });
    }

    handler(request, response) {
        if (request.method !== 'POST') {
            return Worker.returnAccessDenied();
        }

        this.processData(request, response, (data) => {
            if (!data.file || data.file.length <= 0) {
                Worker.returnResult({error: 'File not set'}, response);
            }

            if (!data.sequence) {
                Worker.returnResult({error: 'Sequnce not set'}, response);
            }

            this.calculateSequence(data, result => {
                Worker.returnResult(result, response);
            });
        });
    }

    prepareRules(rules) { // @todo покрыть тестом
        rules.map(rule => {
            if(rule.date_start) {
                rule.date_start = new Date(rule.date_start).getTime();
            }
            if(rule.date_end) {
                let date = new Date(rule.date_end);
                if(rule.date_end.indexOf(':') === -1) {
                    date.setHours(23,59,59,999);
                }
                rule.date_end = date.getTime();
            }
            if(rule.previuos_action_time) {
                rule.previuos_action_time *= 1000;
            }
            return rule;
        });
        return rules;
    }

    check_sequence(rules, actions) {

        Worker.log('rules', rules);
        Worker.log('actions', actions);

        let index = 0;
        let action_last_date = 0;
        let skip = 0;
        let any = false;
        for (let i = 0; i < rules.length; i++) {
            if (rules[i].rule === RULE_ANY) {
                Worker.log('set any mode', true);
                any = true;
                continue;
            }

            if (rules[i].rule !== RULE_EQUAL) {
                continue;
            }

            let rule_action = rules[i].action_key;

            for (let j = skip; j < actions.length; j++) {

                let action_name = actions[j].action || null;

                Worker.log('find:' + i + ':' + j + '_' + rule_action + '==' + action_name + '::' + (rule_action === action_name ? 'true' : 'false'));

                if (rule_action === action_name) {
                    let action_time = new Date(actions[j].datetime).getTime();

                    if (rules[i].date_start && rules[i].date_end) {
                        let proper_date = action_time >= rules[i].date_start && action_time <= rules[i].date_end;
                        if(!proper_date) {
                            i = rules.length + 1;
                            break;
                        }
                    }

                    if (rules[i].previuos_action_time > 0) {
                        if (action_time - action_last_date > rules[i].previuos_action_time) {
                            i = rules.length + 1;
                            break;
                        }
                    }

                    action_last_date = action_time;
                    index++;
                    skip = j + 1;

                    if (any) {
                        any = false;
                        Worker.log('set any mode', false);
                    }

                    break;
                } else if (!any) {
                    i = rules.length + 1;
                    break;
                }
            }
        }

        let ind = rules.reduce((sum, current) => {
            if (current.rule !== RULE_ANY) {
                return sum = sum + 1;
            }
            return sum;
        }, 0);

        return ind === index ? 1 : 0;
    }

    find_sequences(data, sequence_ql) {

        Worker.log('find sequence:', sequence_ql);

        let finded_sequences = 0;

		sequence_ql = this.prepareRules(sequence_ql);

        data.forEach((value) => {

            let actions = Array.from(value);
            actions.sort(Worker.sort_actions_by_date);

            finded_sequences += this.check_sequence(sequence_ql, actions);
        });

        return finded_sequences;
    }

    calculateSequence(data, callback) {

        let TIME_DATASET_READ_BEGIN = Date.now();

        let full_path = __dirname + '/data/' + data.file;

        try {
            fs.accessSync(full_path);
        } catch (e) {
            Worker.log('File ', full_path, 'doesn\'t exist');
            callback({
                sequences: 0,
                statistics: {
                    time: {
                        read_dataset: 0,
                        count_sequences: 0,
                        all: 0
                    }
                },
                error:e.message
            }); // @todo сделать обработку ошибки в app

            Worker.returnResult(e.message);

            return;
        }

        let instream = fs.createReadStream(full_path);
        let outstream = new stream;
        let rl = readline.createInterface(instream, outstream);


        let sequences_data = new Map();

        /** @type {Object} */
		let prepare_keys = this.prepareKeys(data.keys);
		/** @type {Map} */
		let needed_keys = prepare_keys.needed_keys;
		/** @type {Set} */
		let delimeters = prepare_keys.delimeters;

        rl.on('line', (line) => {
            let e = line.split("\t");

            if (!sequences_data.has(e[DATASET_KEY])) {
                sequences_data.set(e[DATASET_KEY], new Set());
            }

			/** If the filters are installed, we will check our data set for compliance */
			if (needed_keys.size) {
				/** @type {Array} */
				let dataset_keys = this.divideDatasetKey(e[DATASET_KEY], delimeters);
				if (this.isMatchedDataset(dataset_keys, needed_keys)) {
					sequences_data.get(e[DATASET_KEY]).add({'action': e[DATASET_ACTION], 'datetime': e[DATASET_DATETIME]});
                }
            } else {
				sequences_data.get(e[DATASET_KEY]).add({'action': e[DATASET_ACTION], 'datetime': e[DATASET_DATETIME]});
            }
        });

        rl.on('close', () => {
            let TIME_DATASET_READ_END = Date.now();

            let TIME_SEQUENCES_BEGIN = Date.now();
            let num = this.find_sequences(sequences_data, data.sequence);
            let TIME_SEQUENCES_END = Date.now();

            Worker.log(data);
            callback({
                sequences: num,
                statistics: {
                    time: {
                        read_dataset: parseFloat((TIME_DATASET_READ_END - TIME_DATASET_READ_BEGIN) / 1000).toFixed(2),
                        count_sequences: parseFloat((TIME_SEQUENCES_END - TIME_SEQUENCES_BEGIN) / 1000).toFixed(2),
                        all: parseFloat((TIME_SEQUENCES_END - TIME_DATASET_READ_BEGIN) / 1000).toFixed(2)
                    }
                }
            });
        });

    }

	/**
	 * Prepare a filter from the query to search in Dataset
	 * @param {*|Array} keys
	 * @returns {Object}
	 */
	static prepareKeys(keys) {
        /** @type {Set} */
        let delimeters = new Set();
        /** @type {Map} */
        let needed_keys = new Map();

        if (keys === undefined || !keys.length) {
            return {needed_keys: needed_keys, delimeters: delimeters};
        }

        for (let i = 0; i < keys.length; i++) {
			/** @type {boolean} */
			let is_values_correct = keys[i].hasOwnProperty('values') && keys[i].values.length;
			/** @type {boolean} */
			let is_position_correct = keys[i].hasOwnProperty('position') && Number.isInteger(keys[i].position);

            /** If no value is specified and their position is no longer processed */
            if (!is_values_correct || !is_position_correct) {
                continue;
            }

            if (keys[i].hasOwnProperty('delimiter')) {
                delimeters.add(keys[i].delimiter);
            }

            for (let v = 0; v < keys[i].values.length; v++) {
                /** @type {string} */
                let value = keys[i].values[v];
                /** @type {Set} */
                let positions = new Set();

                /** If the value exist */
                if (needed_keys.has(value)) {
                    positions = needed_keys.get(value);
                    needed_keys.delete(value);
                }

                positions.add(keys[i].position);
                needed_keys.set(value, positions);
            }
        }

        return {needed_keys: needed_keys, delimeters: delimeters};
    }

    /**
	 * The method will break the line using delimiters and return the key arrays for each separator.
	 * For example, the dividers ['-', '_'], then for the string:
	 * - 1000-2000_12313-21312, the result will be [ ['1000', '2000_12313', '21312'] , ['1000-2000', '12313-21312'] ]
	 * - 1000:2000:30000, the result will be []
	 *
	 * @param {string} dataset_key
	 * @param {Set} delimeters
	 * @returns {Array}
	 */
    static divideDatasetKey(dataset_key, delimeters) {
        let data = [];
        if (typeof dataset_key !== 'string') {
            return data;
        }

        if (!delimeters.size) {
            data.push(dataset_key);
            return data;
        }

        delimeters.forEach(function (delimeter) {
            if (dataset_key.indexOf(delimeter) !== -1) {
                data.push(dataset_key.split(delimeter));
            }
        });

        return data;
    }

	/**
	 * The method will check if there are keys (needed_keys) in dataset_keys in the required positions.
	 *
	 * @param {*|Array} dataset_keys
	 * @param {Map} needed_keys
	 * @returns {boolean}
	 */
	static isMatchedDataset(dataset_keys, needed_keys) {
        if (dataset_keys === undefined || !dataset_keys.length) {
            return false;
        }

        if (!needed_keys.size) {
            return true;
        }

		/** @type {boolean} */
		let is_matched = false;

        for (let i = 0; i < dataset_keys.length; i++) {
            /** @type {Array} */
            let keys = dataset_keys[i];
            for (let k = 0; k < keys.length; k++) {
                /** @type {string} */
                let key_value = keys[k];
                if (!needed_keys.has(key_value)) {
                    continue;
                }

                /** @type {Set} */
                let data_position = needed_keys.get(key_value);
                if (data_position.has(k)) {
                    is_matched = true;
                    break;
                }
            }

            if (is_matched) {
                break;
            }
        }

        return is_matched;
    }

    static sort_actions_by_date(prev, next) {
        if (prev.datetime > next.datetime) {
            return 1;
        }
        if (prev.datetime < next.datetime) {
            return -1;
        }
        return 0;
    }

    processData(request, response, callback) {
        let body = '';
        request.on('data', (data) => {

            // Too much POST data, kill the connection!
            // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
            if (data.length > 1e6) {
                response.writeHead(413, {'Content-Type': 'text/plain'}).end();
                request.connection.destroy();
            }

            body += data;
        });

        request.on('end', () => {
            try {
                body = JSON.parse(body);
                callback(body);
            } catch (e) {
                Worker.returnResult(e.message.toString(), response);
            }
        });
    }

    static returnResult(result, response) {
        response.writeHead(200, {"Content-Type": "application/json"});
        response.end(JSON.stringify(result));
        return true;
    }

    static returnAccessDenied(response) {
        response.writeHead(403, {"Content-Type": "text/plain"});
        response.write("Forbidden");
        response.end();
        return true;
    }

    static log() {
        if (DEBUG !== 'true') {
            return;
        }
        console.log(arguments);
    }



}

if (RUN === true) {
    (new Worker()).run();
}

module.exports = Worker;
