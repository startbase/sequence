'use strict';
const http = require('http');
const nconf = require('nconf');
const fs = require('fs');
const roadmap = require('./data/index');

nconf.argv();

let port = nconf.get('port');
let host = nconf.get('host');

port = port || false;
host = host || false;

if(port === false || host === false) {
    process.exit(-1);
}

for(let r in roadmap) {
    fs.access(roadmap[r], (err) => {
        if (err) {
            fs.mkdir(roadmap[r], (err) =>  {
                if(err) console.log(err);
                fs.writeFile(roadmap[r] + '.gitignore', '*', (err) => {
                    if(err) console.log(err);
                });
            });
        }
    });
}

const server = http.createServer((req, res) => {
    if (req.method !== 'POST') {
        res.end('Нет доступа');
    }

    fs.stat('./data/raw/tmp', (err, stat) => {
        if (err) return;
        console.log(stat);
        if(stat && stat.size >= 52428800) {
            fs.rename('./data/raw/tmp', './data/raw/raw_file_' + Math.round(new Date().getTime()/1000), (err) => {
                if(err)console.log(err);
            })
        }
    });

    let data = '';
    req.on('data', function(chunk) {
        data += chunk.toString('utf8');
    });

    req.on('error', function (err) {
        console.log(err);
    });

    req.on('end', function() {
        console.log(data);
        fs.appendFile('./data/raw/tmp', data, (err) => {
            let rs = "ok";
            if(err) {
                rs = err;
            }
            returnResult(res, JSON.stringify(rs));
        });
    });
});

server.listen(port, host, () => {
   console.log('server start ' + host + ' on port ' + port);
});

function returnResult(res, result) {
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(result);
}