'use strict';

const http = require('http');
const uniqid = require('uniqid');
const ws = new require('ws');
const Scheduler = new require('./scheduler');

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '127.0.0.1';
const WS_PORT = process.env.WS_PORT || 8081;
const WORKER_TIMEOUT = process.env.WORKER_TIMEOUT || 60000;
const DEBUG = process.env.DEBUG || false;

class App {

    constructor() {
        this.clients = new Map();
        this.scheduler = new Scheduler();
        this.stats = {};
        this.stats_responds = [];
    }

    initWebServer() {
        const server = http.createServer((req, res) => {
            if (req.method === 'POST') {
                this.cur_server_res = res;
                let body = '';
                req.on('data', data => body += data);
                try {
                    req.on('end', () => this.processPost(req, res, JSON.parse(body)));
                }
                catch (e) {
                    this.log(e.message);
                    res.end(e.message);
                }
            } else {
                res.end('ok');
            }
        });
        server.listen(PORT, HOST, () => {
            this.log('Server listent to: ', HOST, PORT);
        });
    }

    processPost(req, res, body) {
        this.stats_responds = [];
        this.workers_responds = 0;
        this.scheduler.run(body.storage, data => {
            this.stats = data.stats;
            this.worker_iterator = 0;
            while(this.worker_iterator < data.files.length) {
                this.clients.forEach(socket => {
                    if(!data.files[this.worker_iterator]) {
                        return;
                    }
                    try {
                        let query = {
                            file: data.files[this.worker_iterator++],
                            keys: body.keys,
                            sequence: body.sequence
                        };
                        socket.send(JSON.stringify(query));
                    }
                    catch (e) {
                        this.log(e.message);
                    }
                });
            }

            setTimeout(() => {
                res.end('workers timeout');
            }, WORKER_TIMEOUT);
        });
    }

    sendUserResponse() {
        this.workers_responds++;

        if (this.workers_responds === this.worker_iterator) {
            this.stats = this.calculateResponseStats(this.stats);
            this.cur_server_res.writeHead(200, {"Content-Type": "application/json"});
            this.cur_server_res.end(JSON.stringify(this.stats));
        }
    }

    calculateResponseStats(stats) {
        this.stats_responds.forEach(body => {
            stats.sequence_count += body.sequences;
            stats.processed.time += +body.statistics.time.all;
            stats.processed.workers++;
            let task = {
                time: +body.statistics.time.all,
                sequence: body.sequences
            };
            stats.tasks.push(task);
        });
        return stats;
    }

    initWSReceiver() {
        let web_socket_server = new ws.Server({
            port: WS_PORT,
            host: HOST
        });
        web_socket_server.on('connection', (ws) => {
            const id = uniqid();
            this.clients.set(id, ws);
            this.log('new connection ', id, ws._socket.remoteAddress);

            ws.on('message', (raw_data) => {

                try {
                    let data = JSON.parse(raw_data);
                    this.stats_responds.push(data);
                    this.log('data from worker:', data);
                } catch (e) {
                    this.log('Error from worker:', e.message);
                }

                this.sendUserResponse();

            });

            ws.on('close', () => {
                this.log('client disconected', id);
                this.clients.delete(id);
            });

            ws.on('error', e => {
                this.log(e);
            });
        });
    };

    log(message) {
        if (DEBUG) {
            console.log(arguments);
        }
    }

    init() {
        this.initWebServer();
        this.initWSReceiver();
    };
}

(new App()).init();
