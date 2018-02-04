"use strict";

const path = require('path');
const fs = require('fs');

let write_lock = false;

let exists_files = [];

module.exports = function () {
    const WRITING_INTERVAL = 1000;
    const queue_manager = new (function () {
        const queues = [
            {}, {}
        ];

        let readable_num = 0;

        this.getActive = function () {
            return queues[readable_num];
        };

        this.getAndRevert = function () {
            let writable_num = readable_num;
            readable_num = readable_num === 1 ? 0 : 1;
            let data = queues[writable_num];
            queues[writable_num] = {};
            return data;
        };
    })();

    this.s_events = 0;

    this.writeEnd = function () {

    };

    this.insert = function (data) {
        let p = {};
        p.storage = data.storage;
        p.file = data.file;

        let filename = p.storage + '/' + p.file;

        let line = [data.storage, data.partition, data.key, data.datetime, data.action];

        let queue = queue_manager.getActive();
        if (!queue.hasOwnProperty(filename)) {
            queue[filename] =  {sys:{}, data:[]};
        }

        queue[filename].sys = p;

        this.s_events = this.s_events + 1;

        queue[filename].data.push(line.join("\t"));
    };

    this.check_dir = function (dir) {
        console.log('check dir', dir);
        try {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }
        } catch (e) {

        }
    };

    this.write = function () {
        if (write_lock) {
            return;
        }

        write_lock = true;

        let queue = queue_manager.getAndRevert();

        let i = 0;
        for (let filename in queue) {
            i++;
            if (!queue.hasOwnProperty(filename)) {
                continue;
            }

            let sys = queue[filename].sys;
            if (!sys) {
                continue;
            }

            if (i === 1) {
                if (exists_files.indexOf(filename) === -1) {
                    this.check_dir(path.join(__dirname, 'data'));
                    this.check_dir(path.join(__dirname, 'data', sys.storage));
                    exists_files.push(filename);
                }
            }

            fs.appendFile(path.join(__dirname, 'data', filename), (queue[filename].data.join("\n")+"\n"), {flag: "a+"}, function () {
                //console.log('w s', path.join(__dirname, 'data', filename), queue[filename].data.join("\n"));
            });
        }

        write_lock = false;
        this.writeEnd();
    };

    setInterval(() => {
        this.write();
    }, WRITING_INTERVAL);
};