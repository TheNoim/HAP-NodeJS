/**
 * Created by herrb on 30.09.2016.
 */
/**
 * Created by herrb on 09.09.2016.
 */
//const colors = require('colors/safe');
const colors = require('chalk');
const async = require('async');
const fs = require('fs');

let fd;
let logqueue = async.queue( (task, callback) => {
    logQ(task.m, callback);
}, 1);

function log(message) {
    logqueue.push({m: message});
}

function logQ(message, call) {
    let d = new Date();
    let p = `./log-${d.getDay()}.${d.getMonth()}.${d.getYear()}.log`;
    fs.appendFile(p, message + '\n', (err) => {
        if (err) {
            co('error', err);
        }
        call();
    });
}

module.exports.log = function (type, message) {
    const date = new Date().toLocaleTimeString();
    switch (type) {
        default:
            console.log(colors.white.bold('[') + colors.cyan(date) + colors.white.bold('] ') + colors.white(message));
            log(`[${date}] ${message}`);
            break;
        case "info":
            console.log(colors.white.bold('[') + colors.cyan(date) + colors.white.bold('] ') + colors.white.bold('[') + colors.yellow("INFO") + colors.white.bold('] ') + colors.white(message));
            log(`[${date}] [INFO] ${message}`);
            break;
        case "error":
            console.log(colors.white.bold('[') + colors.cyan(date) + colors.white.bold('] ') + colors.white.bold('[') + colors.red("ERROR") + colors.white.bold('] ') + colors.white(message));
            log(`[${date}] [ERROR] ${message}`);
    }
};

