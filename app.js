'use strict';

const express = require('express');
const nconf = require('nconf');
const bodyParser = require('body-parser');
const uniqid = require('uniqid');
const ws = new require('ws');

nconf.argv();


class App {

    constructor() {
        this.clients = {};
    }

    initWebServer() {
        let port = nconf.get('port');
        let host = nconf.get('host');

        let web_app = new express();

        web_app.use(bodyParser.json());
        web_app.use(bodyParser.urlencoded({extended: true}));

        port = port || false;
        host = host || false;

        if(port === false || host === false) {
            console.error('web server could not start');
            return;
            process.exit(-1);
        }

        web_app.get('/get', (req, res) => {
            res.end('213');
        });

        web_app.listen(port, host, () => {
            console.log('server start ' + host + ' listening on port ' + port);
        });

    }

    initWSReceiver() {
        let web_socket_server = new ws.Server({
            port: 8081
        });
        web_socket_server.on('connection', (ws) => {
            const id = uniqid();
            this.clients[id] = ws;
            console.log('new connection ' + id, ws._socket.remoteAddress);

            ws.on('message', (raw_data) => {
                //hello data

                const data = JSON.parse(raw_data);
                console.log(data);
            });

            ws.on('close', () => {
                console.log('' + id);
                delete this.clients[id];
            });
        });
    };

    init() {
        this.initWebServer();
        this.initWSReceiver();
    };
};

(new App()).init();
