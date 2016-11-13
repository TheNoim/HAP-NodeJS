/**
 * Created by herrb on 30.09.2016.
 */
const path = require('path');
const storage = require('node-persist');
const uuid = require(`${__dirname}/index.js`).uuid;
const Accessory = require('./').Accessory;
const accessoryLoader = require('./lib/AccessoryLoaderMod');
const co = require('./lib/Console');

co('info',"HAP-NodeJS starting...");


// Initialize our storage system
storage.initSync();

// Our Accessories will each have their own HAP server; we will assign ports sequentially
var targetPort = 51826;

// Load up all accessories in the /accessories folder
var dir = path.join(__dirname, "accessories");
accessoryLoader.loadDirectory(dir, function (accessories) {
    // Publish them all separately (as opposed to BridgedCore which publishes them behind a single Bridge accessory)
    //console.log(JSON.stringify(accessories));
    accessories.forEach(function (accessory, ind) {
        // To push Accessories separately, we'll need a few extra properties
        if (!accessory.username)
            throw new Error("Username not found on accessory '" + accessory.displayName +
                "'. Core.js requires all accessories to define a unique 'username' property.");

        if (!accessory.pincode)
            throw new Error("Pincode not found on accessory '" + accessory.displayName +
                "'. Core.js requires all accessories to define a 'pincode' property.");

        // publish this Accessory on the local network
        co('info', 'Publishe: ' + accessory.displayName + ' Index: ' + ind);
        accessory.publish({
            port: targetPort++,
            username: accessory.username,
            pincode: accessory.pincode
        });
        co('info', 'Published: ' + accessory.displayName + ' Index: ' + ind);
    });
});

