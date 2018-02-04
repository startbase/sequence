'use strict';

const http = require('http');

const fs = require('fs');
const readline = require('readline');
const stream = require('stream');

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '127.0.0.1';
const DEBUG = process.env.DEBUG || false;

const DATASET_SEGMENT = 0;
const DATASET_PARTITION = 1;
const DATASET_KEY = 2;
const DATASET_DATETIME = 3;
const DATASET_ACTION = 4;

const RULE_EQUAL = 'equal';
const RULE_ANY = 'any';

const server = http.createServer(handler);

server.listen(PORT, HOST, () => {
    log('Server listent to: ', HOST, PORT);
});


function check_sequence(rules, actions) {

    log('rules', rules);
    log('actions', actions);

    let index = 0;
    let skip = 0;
    let any = false;
    for (let i = 0; i < rules.length; i++) {
        if (rules[i].rule === RULE_ANY) {
            log('set any mode', true);
            any = true;
            continue;
        }

        if (rules[i].rule !== RULE_EQUAL) {
            continue;
        }

        let rule_action = rules[i].action_key;

        for (let j = skip; j < actions.length; j++) {

            let action_name = actions[j].action || null;

            log('find:' + i + ':' + j + '_' + rule_action + '==' + action_name + '::' + (rule_action === action_name ? 'true' : 'false'));

            if (rule_action === action_name) {
                index++;
                skip = j + 1;

                if (any) {
                    any = false;
                    log('set any mode', false);
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

function find_sequences(data, sequence_ql) {

    log('find sequence:', sequence_ql);

    let finded_sequences = 0;

    data.forEach((value) => {

        let actions = Array.from(value);
        actions.sort(sort_actions_by_date);

        finded_sequences += check_sequence(sequence_ql, actions);
    });

    return finded_sequences;
}

function handler(request, response) {
    if (request.method !== 'POST') {
        return returnAccessDenied();
    }

    processData(request, response, (data) => {

        if (!data.file || data.file.length <= 0) {
            returnResult({error: 'File not set'}, response);
        }

        if (!data.sequence) {
            returnResult({error: 'Sequnce not set'}, response);
        }

        let TIME_DATASET_READ_BEGIN = Date.now();

        let instream = fs.createReadStream(__dirname + '/data/' + data.file);
        let outstream = new stream;
        let rl = readline.createInterface(instream, outstream);


        let sequences_data = new Map();

        rl.on('line', (line) => {
            let e = line.split("\t");

            if (!sequences_data.has(e[DATASET_KEY])) {
                sequences_data.set(e[DATASET_KEY], new Set());
            }

            sequences_data.get(e[DATASET_KEY]).add({'action': e[DATASET_ACTION], 'datetime': e[DATASET_DATETIME]});
        });

        rl.on('close', () => {
            let TIME_DATASET_READ_END = Date.now();

            let TIME_SEQUENCES_BEGIN = Date.now();
            let num = find_sequences(sequences_data, data.sequence);
            let TIME_SEQUENCES_END = Date.now();

            returnResult({
                sequences: num,
                statistics: {
                    time: {
                        read_dataset: parseFloat((TIME_DATASET_READ_END-TIME_DATASET_READ_BEGIN)/1000).toFixed(2),
                        count_sequences: parseFloat((TIME_SEQUENCES_END-TIME_SEQUENCES_BEGIN)/1000).toFixed(2),
                        all:parseFloat((TIME_SEQUENCES_END-TIME_DATASET_READ_BEGIN)/1000).toFixed(2)
                    }
                }
            }, response);
        });

        log(data);
    });
}

function processData(request, response, callback) {

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
            returnResult(e.message.toString(), response);
        }
    });
}

function sort_actions_by_date(prev, next) {
    if (prev.datetime > next.datetime) {
        return 1;
    }
    if (prev.datetime < next.datetime) {
        return -1;
    }
    return 0;
}

function returnResult(result, response) {
    response.writeHead(200, {"Content-Type": "application/json"});
    response.end(JSON.stringify(result));
    return true;
}

function returnAccessDenied(response) {
    response.writeHead(403, {"Content-Type": "text/plain"});
    response.write("Forbidden");
    response.end();
    return true;
}

function log() {
    if (DEBUG !== 'true') {
        return;
    }
    console.log(arguments);
}