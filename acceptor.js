const http = require('http');
const nconf = require('nconf');
const fs = require('fs');

nconf.argv();

let port = nconf.get('port');
let host = nconf.get('host');

port = port || false;
host = host || false;

if(port === false || host === false) {
    process.exit(-1);
}


const server = http.createServer((req, res) => {
    if (req.method !== 'POST') {
        res.end('Нет доступа');
    }

    fs.access('./data/raw', (err) => {
        if (err) {
            fs.mkdir('./data/raw', (err) =>  {
               if(err) console.log(err);
            });
        }
    });

    let data = '';
    req.on('data', function(chunk) {
        data += chunk.toString('utf8');
    });

    req.on('end', function() {
        console.log(data);
        fs.appendFile('./data/raw/data', JSON.parse(data), (err) => {
            let rs = "ok";
            if(err) rs = err;
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