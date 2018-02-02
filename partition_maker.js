'use strict';
const fs = require('fs');

console.log('start making partition');

fs.readdir('./data/raw/', (err, files) => {
    files.forEach((item, i, arr) => {
        if(item === '.gitignore') {
            return;
        }
        setTimeout(() => {handleFile(item)}, 0);
    });
});

function handleFile(file) {
    let path = './data/raw/' + file;
    let stream = new fs.ReadStream(path, {encoding: 'utf-8'});

    let data = '';
    stream.on('readable', () => {
        let chunk = stream.read();
        if (chunk){
            data += chunk;
        }
    });

    stream.on('error', (err) => {
        console.log(err);
    });

    stream.on('end', () => {
        let res = data.split(',');
        let pack = [];
        let key = '';
        let segment = '';
        res.forEach((item) => {
            let event = item.replace(/\"/g,"").split(';');
            let event_tab = event[1] + '\t' + event[2] + '\t' + event[3] + '\t' + event[4] + '\n';
            try {
                fs.accessSync('./data/' + segment + '/');
            } catch (e) {
                fs.mkdirSync('./data/' + segment + '/');
                fs.writeFile('./data/' + segment + '/' + '.gitignore', '*', (err) => {
                    if(err) console.log(err);
                });
            }
            if(key !== event[2] && key !== '') {
                fs.appendFileSync('./data/' + segment + '/' + key + '.csv', pack.join(''));
                pack = []
            }
            pack.push(event_tab);
            key = event[2];
            segment = event[0];
        });
    });
}