"use strict";
const WebSocket = require('ws');

function WebSocketClient(url, reconnect_interval, callback) {
    this.reconnect_interval = reconnect_interval;
    this.url = url;
    this.init = callback;

    this.open();
}

WebSocketClient.prototype.open = function() {
    this.i = new WebSocket(this.url);
    this.i.on('error', e => {});
    this.i.on('close',(e) => {
        if(e !== 1000) {
            this.reconnect();
        }
    });
    this.init(this.i);
};
WebSocketClient.prototype.send = function(data,option) {
    if(this.i.readyState === WebSocket.OPEN) {
        this.i.send(data, option);
    }
};
WebSocketClient.prototype.reconnect = function() {
    setTimeout(() => {
        this.open();
    }, this.reconnect_interval);
};

module.exports = WebSocketClient;