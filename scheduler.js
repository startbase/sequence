"use strict";

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3006;
const HOST = process.env.HOST || '127.0.0.1';

class Scheduler {

    sendTask(worker, tasks, sequence, stats, callback) {
        const query = {
            "file": tasks,
            "sequence": sequence
        };

        const url_data = url.parse(worker.url);
        const options = {
            hostname: url_data.hostname,
            port: url_data.port,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const req = http.request(options, res => {
            res.on('data', (body) => {
                try {
                    body = JSON.parse(body.toString());
                    stats.sequence_count += body.sequences;
                    stats.processed.time += body.statistics.time.all;
                }
                catch(e) {
                    console.log('Error parsing task result', e);
                }
                finally {
                    callback();
                }
            });
        });
        req.on('error', e => {
            stats.processed.errors++;
            console.log('Problem with request: ' + e.message);
            callback();
        });

        req.write(JSON.stringify(query));
        req.end();
    }

    balance(files, workers, sequence, stats, callback) {
        let processed_files = 0;
        stats.processed.files = files.length;
        stats.processed.workers = workers.length;
        let files_per_worker = Math.ceil(files.length / workers.length);
        for (let i = 0; i < workers.length; i++) {
            let cur_elem = i * files_per_worker;
            if(cur_elem >= files.length) {
                break;
            }
            let tasks = files.slice(cur_elem, cur_elem + files_per_worker);
            tasks.forEach(task => {
                this.sendTask(workers[i], task, sequence || [], stats, () => {
                    processed_files++;
                    if(processed_files == stats.processed.files) {
                        callback();
                    }
                });
            });
        }
    };

    readdir(storage, workers, sequence, stats, callback) {
        const BASE_STORAGE_DIR = './data';
        let dir = path.join(__dirname, BASE_STORAGE_DIR, storage);
        fs.access(dir, err => {
            if(err) {
                console.error('Can not read directory:', dir);
                return;
            }
            fs.readdir(dir, (err, items) => {
                if(err) {
                    console.log(err);
                    return;
                }
                items.forEach(item => {
                    fs.stat(path.join(dir, item), (err, file_stats) => {
                        if(err) {
                            console.error('Cannot get', item, 'size');
                            return;
                        }
                        stats.processed.size += file_stats.size / 1000.0;
                    });
                });
                this.balance(items.map(file => path.join(storage, file)), workers, sequence, stats, callback);
            });
        });
    }

    run() {
        const server = http.createServer((req, res) => {
            let body = [];
            let stats = {
                'sequence_count': 0,
                'processed': {
                    'files': 0,
                    'size': 0, // kb
                    'workers': 0,
                    'time': 0, // seconds
                    'errors': 0
                },
            };
            req.on('error', err => {
                console.error(err);
            });
            req.on('data', chunk => {
                body.push(chunk);
            });
            req.on('end', () => {
                try {
                    body = JSON.parse(Buffer.concat(body).toString());
                }
                catch(e) {
                    console.error('Error parsing responce', e);
                    res.end();
                    return;
                }
                this.readdir(body.storage, body.workers, body.sequence, stats, items => {
                    res.writeHead(200, {"Content-Type": "application/json"});
                    res.end(JSON.stringify(stats));
                });
            });
        });

        server.listen(PORT, HOST, () => {
//            console.log('Server listent to: ', HOST, PORT);
        });
    }

};

(new Scheduler()).run();
