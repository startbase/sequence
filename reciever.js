'use strict';

const http = require('http');

const fs = require('fs');

const DataStorage = require(__dirname + '/storage.js');
const data_storage = new DataStorage();

const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || '127.0.0.1';
const DEBUG = process.env.DEBUG || false;

const MAX_KEYS_IN_FILE = 1000;

const server = http.createServer(handler);

let keys_cache = new Map();

let index_updated = 0;
let index = {
    files: new Map(),
    last_file: 0
};

setInterval(() => {
    if (index.files.has(index.last_file)) {
        if (index.files.get(index.last_file).size >= MAX_KEYS_IN_FILE) {
            index.last_file = index.last_file + 1;
            log('change last file to:', index.last_file);
        }
    }
}, 1000);

setInterval(() => {
    if (index_updated === 0) {
        return;
    }

    let index_synced = {files:[]};

    index.files.forEach((value, file) => {
        index_synced.files.push({file:file, keys:Array.from(value)});
    });

    fs.writeFile(index_file, JSON.stringify(index_synced), function (err) {
        log('index.json synced');
        if (err) throw err;
    });

    index_synced = {};
    index_updated = 0;
}, 1000);

let index_file = __dirname + '/data/index.json';

if (!fs.existsSync(index_file)) {
    fs.writeFile(index_file, JSON.stringify({files:[]}), function (err) {
        log('Index.json created');
        if (err) throw err;
    });
}

fs.readFile(index_file, 'utf8', function (err, data) {
    if (err) throw err;

    try {
        let index_draft = JSON.parse(data);

        if (index_draft.files.length > 0) {
            index_draft.files.forEach((item) => {
                if (!index.files.has(item.file)) {
                    index.files.set(item.file, new Set());
                }

                item.keys.forEach((key) => {
                    index.files.get(item.file).add(key);
                });

                if (index.last_file < item.file) {
                    index.last_file = item.file;
                }


            });

        }

        log('index:', index);

        server.listen(PORT, HOST, () => {
            log('Server listent to: ', HOST, PORT);
        });
    } catch (e) {
        throw e;
    }
});

function handler(request, response) {
    if (request.method !== 'POST') {
        return returnAccessDenied();
    }

    processData(request, response, (data) => {

        returnResult('ok', response);

        if (!data.data || !(data.data instanceof Array) || data.data.length === 0) {
            returnResult({error: 'Data not set'}, response);
        }

        data.data.forEach((line) => {
            if (line.storage && line.partition && line.key && line.datetime && line.action) {
                log('key find: ', line.key);
                if (keys_cache.has(line.key)) {
                    log('key find in cache', line.key);
                    line.file = keys_cache.get(line.key);
                } else {
                    log('key search in index.json', line.key);
                    let fe = false;

                    index.files.forEach((value, file) => {
                        if (fe === true)
                            return;

                        log('key search in file:', file, value, line.key);

                        if (value.has(line.key)) {
                            log('key finded in index.json', line.key);
                            line.file = file;
                            index.files.get(file).add(line.key);
                            fe = true;
                        }
                    });

                    if (fe === false) {

                        if (!index.files.has(index.last_file)) {
                            index.files.set(index.last_file, new Set());
                        }

                        index.files.get(index.last_file).add(line.key);
                        index_updated = 1;

                        line.file = index.last_file;

                        log('key add to index.json', line.key);
                    }
                }

                if (line.file === undefined || line.file.length === 0) {
                    return;
                }

                log('key wrote to:', line.file, line.key);
                line.file = 'part_' + line.file + '.tsv';
                data_storage.insert(line);
            }
        });
    });
}

function processData(request, response, callback) {

    let body = '';
    request.on('data', function (data) {

        // Too much POST data, kill the connection!
        // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
        if (data.length > 1e7) {
            response.writeHead(413, {'Content-Type': 'text/plain'}).end();
            request.connection.destroy();
        }

        body += data;
    });

    request.on('end', function () {
        try {
            body = JSON.parse(body);
            callback(body);
        } catch (e) {
            returnResult(e.message.toString(), response);
            throw e;
        }
    });
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