/**
 * Created by herrb on 30.09.2016.
 */
/**
 * Created by nilsbergmann on 15.09.16.
 */
const Chalk = require('chalk');
const c = require('./console2');


module.exports = function (type, data) {
    if (process.connected){
        process.send({'x': 'm', 'type': type, data:  data});
    } else {
        c.log('type', '[HomeKit] '+ data);
    }
};