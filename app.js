'use strict';

const express = require('express'); // @todo-r тоже убрать, он на старте дает +50мб к процессу
const nconf = require('nconf'); // @todo-r нужно убрать
const bodyParser = require('body-parser'); // @todo-r reciever.js:164
const uniqid = require('uniqid');
const ws = new require('ws');

nconf.argv();


class App {

    constructor() {
        this.clients = {}; // используй Map
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

        web_app.listen(port, host, () => {
            console.log('server start ' + host + ' listening on port ' + port);
        });

    }

    initWSReceiver() {
        let web_socket_server = new ws.Server({
            port: 8081 // @todo-r env WEB_PORT
        });
        web_socket_server.on('connection', (ws) => {
            const id = uniqid();
            this.clients[id] = ws;
            console.log('new connection ' + id, ws._socket.remoteAddress); // используй log из reciever.js:203 c env DEBUG

            ws.on('message', (raw_data) => {
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
