/**
 * Created by herrb on 30.09.2016.
 */
/**
 * Created by herrb on 12.09.2016.
 */
const r = require('rethinkdb');
const c = require('./console');
var irc = undefined;
const mod = this;

module.exports.checkDB = function (callback) {
    mod.createDB('HomePuter', function () {
        mod.createTable('HomePuter', 'Data', function () {
            mod.createIndex('HomePuter', 'Data', 'state', false, function () {
                mod.createIndex('HomePuter', 'Data', 'search', true, function () {
                    mod.createIndex('HomePuter', 'Data', 'hpid', false, function () {
                        mod.createDB('HomePuterInterface', function () {
                            mod.createTable('HomePuterInterface', 'Floors', function () {
                                mod.createTable('HomePuterInterface', 'Rooms', function () {
                                    mod.createTable('HomePuterInterface', 'Corridors', function () {
                                        mod.createIndex('HomePuter', 'Data', 'type', false, function () {
                                            mod.createIndex('HomePuter', 'Data', 'homekit_enabled', false, function () {
                                                mod.createTable('HomePuter', 'Settings', function () {
                                                    mod.validateSettings(function () {
                                                        c.log('info', 'Überprüfung der Einstellungen abgeschlossen.');
                                                        callback();
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};
module.exports.validateSettings = function (callback) {
    var re = function (callback) {
        r.db('HomePuter').table('Settings').get(0).run(mod.rc, function (err, result) {
            if (err) c.log('error', 'Error: ' + err.toString());
            if (!result){
                r.db('HomePuter').table('Settings').insert({
                    id: 0,
                    homekit_pin: "031-45-154",
                    homekit_enabled: false
                }).run(mod.rc, function () {
                    re(callback);
                });
                return;
            }
            c.log('info', 'Result: ' + JSON.stringify(result));
            var update = result;
            if (result.homekit_pin){
                if (!result.homekit_pin.match(/^[0-9]{3}-[0-9]{2}-[0-9]{3}$/)){
                    update.homekit_pin = "031-45-154";
                }
            } else {
                update.homekit_pin = "031-45-154";
            }
            if (result.homekit_enabled == undefined || result.homekit_enabled == null){
                update.homekit_enabled = false;
            }
            r.db('HomePuter').table('Settings').get(0).update(update).run(mod.rc, function (err, result) {
                callback();
            });
        });
    };
    re(callback);
};
module.exports.createDB = function (dbname, callback) {
    c.log('info', 'Erstelle Datenbank ' + dbname + '.');
    r.dbCreate(dbname).run(this.rc, function () {
        callback();
    });
};

module.exports.createTable = function (dbname, tablename, callback) {
    c.log('info', 'Erstelle Tabelle ' + tablename + ' in Datenbank ' + dbname + '.');
    r.db(dbname).tableCreate(tablename).run(this.rc, function () {
        callback();
    });
};
module.exports.createIndex = function (dbname, tablename, indexname, multi, callback) {
    c.log('info', 'Erstelle Index ' + indexname + 'in der Tabelle ' + tablename + ' die sich in der Datenbank ' + dbname + ' befindet.');
    r.db(dbname).table(tablename).indexCreate(indexname, {multi: multi}).run(this.rc, function () {
        console.log(indexname);
        callback();
    });
};

module.exports.rc = irc;

module.exports.connectDB = function (callback, mainWindow) {
    if (!irc){
        r.connect({host: 'localhost', port: 28015}, function (err, conn) {
            if (err) {
                c.log("error", "Es konnte keine Verbindung zur Datenbank hergestellt werden.");
                if (mainWindow != null){
                    mainWindow.webContents.executeJavaScript("openFatalError('Datenbanken Fehler', 'Es konnte keine Verbindung zur Datenbank hergestellt werden.', true)");
                }
                return;
            }
            irc = conn;
            module.exports.rc = conn;
            callback();
        });
    } else {
        callback();
    }

};