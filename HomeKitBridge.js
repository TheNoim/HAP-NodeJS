/**
 * Created by nilsbergmann on 22.10.16.
 */
/**
 * Created by herrb on 30.09.2016.
 */
const path = require('path');
const storage = require('node-persist');
const uuid = require(`${__dirname}/index.js`).uuid;
const Accessory = require('./').Accessory;
const accessoryLoader = require('./lib/AccessoryLoaderMod');
const Bridge = require('./').Bridge;
const co = require('./lib/Console');
const async = require('async');

co('info',"HAP-NodeJS starting...");


// Initialize our storage system
storage.initSync();

// Our Accessories will each have their own HAP server; we will assign ports sequentially
var targetPort = 51826;

// Load up all accessories in the /accessories folder
var dir = path.join(__dirname, "accessories");
accessoryLoader.loadDirectory(dir, function (accessories) {
    var bridge = new Bridge('HomePuterBridge', uuid.generate("HomePuterBridge"));
    bridge.on('identify', function(paired, callback) {
        console.log("Node Bridge identify");
        callback(); // success
    });
    async.each(accessories, (accessory, callback) => {
        bridge.addBridgedAccessory(accessory);
        callback();
    }, () => {
        bridge.publish({
            username: "CD:22:3D:E3:CE:F6",
            port: 51826,
            pincode: "031-45-154",
            category: Accessory.Categories.BRIDGE
        });
    });

// Publish the Bridge on the local network.

});

