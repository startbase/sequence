"use strict";

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

class Scheduler {

    balance(files, workers_cnt) {
        let processed_files = 0;
        let tasks = [];
        let files_per_worker = Math.ceil(files.length / workers_cnt);
        for (let i = 0; i < workers_cnt; i++) {
            let cur_elem = i * files_per_worker;
            if(cur_elem >= files.length) {
                break;
            }
            tasks.push(files.slice(cur_elem, cur_elem + files_per_worker));
        }
        return tasks;
    };

    readdir(storage, workers_cnt, stats, callback) {
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
                        stats.tasks[path.join(storage, item)] = {};
                        stats.tasks[path.join(storage, item)]['size'] = file_stats.size / 1000.0;
                    });
                });
                stats.processed.files = items.length;
                stats.processed.workers = workers_cnt;
                let res = this.balance(items.map(file => path.join(storage, file)), workers_cnt);
                callback({files: res, stats: stats});
            });
        });
    }

    run(storage, workers_cnt, callback) {
        let stats = {
            'sequence_count': 0,
            'processed': {
                'files': 0,
                'size': 0, // kb
                'workers': 0,
                'time': 0, // seconds
                'errors': 0
            },
            'tasks': []
        };
        this.readdir(storage, workers_cnt, stats, res => {
            callback(res);
        });
    }
}

module.exports = Scheduler;
