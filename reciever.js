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

let index_file = __dirname + '/data/index.json';

if (!fs.existsSync(index_file)) {
    fs.writeFile(index_file, JSON.stringify(index), function (err) {
        log('Index.db created');
        if (err) throw err;
    });
}

fs.readFile(index_file, 'utf8', function (err, data) {
    if (err) throw err;

    try {
        let index_draft = JSON.parse(data);
        index_draft.files.forEach((item) => {
            if (!index.files.has(item.file)) {
                index.files.set(item.file, new Set());
            }

            item.keys.forEach((key) => {
                index.files.get(item.file).add(item.keys);
            });

            if (index.last_file < item.file) {
                index.last_file = item.file;
            }
        });

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
                if (keys_cache.has(line.key)) {
                    line.file = keys_cache.get(line.key);
                } else {
                    let fe = false;
                    index.files.forEach((value, file) => {
                        if (fe)
                            return;

                        if (value.has(line.key)) {
                            line.file = file;
                            value.add(line.key);
                            fe = true;
                        }
                    });

                    if (!fe) {
                        if (index.files.has(index.last_file)) {
                            index.files.get(index.last_file).add(line.key);
                        } else {
                            index.files.set(index.last_file, new Set([line.key]));
                        }

                        line.file = index.last_file;
                    }
                }

                if (line.file === undefined || line.file.length === 0) {
                    return;
                }

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