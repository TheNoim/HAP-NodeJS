/**
 * Created by herrb on 30.09.2016.
 */
/**
 * Created by nilsbergmann on 17.09.16.
 */
const path = require('path');
const args = require('optimist').argv;
const net = require('net');
const mod = this;
var client = null;
var connected = false;

module.exports.init = function (callback) {
    if(args.sockel){
        client = net.connect({path: args.sockel.toString()}, function () {
            connected = true;
            callback();
        });
    }
};

module.exports = function (data) {
    if (client){
        if (connected){
            sendData(data);
        } else {
            mod.init(function () {
                sendData(data);
            });
        }
    } else {
        mod.init(function () {
            sendData(data);
        });
    }
};

function sendData(data) {
    const json = JSON.stringify(data);
    console.log('CLIENT:'+client);
    client.write(json + '\0', 'utf-8');
}