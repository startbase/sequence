'use strict';

const http = require('http');
const uniqid = require('uniqid');
const ws = new require('ws');
const Scheduler = new require('./scheduler');

const PORT = process.env.PORT || 3006;
const HOST = process.env.HOST || '127.0.0.1';
const WS_PORT = process.env.WS_PORT || 8081;

class App {

    constructor() {
        this.clients = new Map();
        this.sceduler = new Scheduler();
        this.stats_responds = [];
    }

    initWebServer() {
        const server = http.createServer((req, res) => {
            if(req.method === 'POST') {
                let body = '';
                req.on('data', data => body += data);
                try {
                    req.on('end', () => this.processPost(req, res, JSON.parse(body)));
                }
                catch(e) {
                    res.end('unknown error');
                }
            }
        });
        server.listen(PORT, HOST, () => {
//            console.log('Server listent to: ', HOST, PORT);
        });
    }

    processPost(req, res, body) {
        this.stats_responds = [];
        this.sceduler.run(body.storage, this.clients.size, data => {
            let stats = data.stats;
            let i = 0;
            this.clients.forEach(socket => {
                data.files[i].forEach(file => {
                    try {
                        let query = {
                            file: file,
                            sequence: body.sequence
                        };
                        socket.send(JSON.stringify(query));
                        i++;
                    }
                    catch(e) {
                        console.log(e);
                    }
                });
            });
            let interval = setInterval(() => {
                if(this.stats_responds.length === i) {
                    stats = this.calculateResponseStats(stats);
                    res.writeHead(200, {"Content-Type": "application/json"});
                    res.end(JSON.stringify(stats));
                    clearInterval(interval);
                }
            }, 1000);
            setTimeout(() => {
                res.end('workers timeout');
                clearInterval(interval);
            }, 5000);
        });
    }

    calculateResponseStats(stats) {
        this.stats_responds.forEach(body => {
            stats.sequence_count += body.sequences;
            stats.processed.time += +body.statistics.time.all;
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
            port: WS_PORT
        });
        web_socket_server.on('connection', (ws) => {
            const id = uniqid();
            this.clients.set(id, ws);
            console.log('new connection ' + id, ws._socket.remoteAddress);

            ws.on('message', (raw_data) => {
                //hello data

                let data = JSON.parse(raw_data);
                this.stats_responds.push(data);
            });

            ws.on('close', () => {
                this.clients.delete(id);
            });
        });
    };

    init() {
        this.initWebServer();
        this.initWSReceiver();
    };
};

(new App()).init();
