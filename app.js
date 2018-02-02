'use strict';
const express = require('express');
const nconf = require('nconf');
const bodyParser = require('body-parser');

nconf.argv();

let port = nconf.get('port');
let host = nconf.get('host');

let app = new express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

port = port || false;
host = host || false;

if(port === false || host === false) {
    process.exit(-1);
}

app.get('/get', (req, res) => {
    res.end('213');
});

app.listen(port, host, () => {
    console.log('server start ' + host + ' listening on port ' + port);
});