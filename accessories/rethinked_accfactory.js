/**
 * Created by herrb on 30.09.2016.
 */
/**
 * Created by nilsbergmann on 15.09.16.
 */
const dbtools = require('../lib/database');
const r = require('rethinkdb');
const co = require('../lib/Console');
const Accessory = require('../index').Accessory;
const Service = require('../index').Service;
const Characteristic = require('../index').Characteristic;
const uuid = require('../index').uuid;
const send = require('../lib/Local');
const child_process = require('child_process');
const async = require('async');
const debug = require('debug');
const rftd = debug('Task:Refresh');
const rollladen = debug('Rollladen');

var glob_pin = '031-45-154';

module.exports.initAccFactory = function (callback) {
    co('info', 'Verbinde zur Datenbank...');
    dbtools.connectDB(function () {
        co('info', 'Verbunden!');
        co('info', 'Lade Pin...');
        r.db('HomePuter').table('Settings').get(0).run(dbtools.rc, function (err, result) {
            if (result.homekit_pin) {
                glob_pin = result.homekit_pin;
            }
            /*
             console.log("\x1b[30;47m%s\x1b[0m", "                       ");
             console.log("\x1b[30;47m%s\x1b[0m", "    ┌────────────┐     ");
             console.log("\x1b[30;47m%s\x1b[0m", "    │ " + glob_pin + " │     ");
             console.log("\x1b[30;47m%s\x1b[0m", "    └────────────┘     ");
             console.log("\x1b[30;47m%s\x1b[0m", "                       ");*/
            co('info', '                       ');
            co('info', '    ┌────────────┐     ');
            co('info', '    │ ' + glob_pin + ' │     ');
            co('info', '    └────────────┘     ');
            co('info', '                       ');
            co('info', 'Lade alle Objekte die für HomeKit aktiviert sind...');
            r.db('HomePuter').table('Data').getAll(true, {index: 'homekit_enabled'}).run(dbtools.rc, function (err, result) {
                result.toArray(function (err, result) {
                    if (err) {
                        co('error', err.toString());
                        return;
                    }
                    if (result) {
                        var accessories = [];
                        result.forEach(function (cu, index) {
                            const sensor = AddAccessories(cu);
                            if (sensor != null) {
                                accessories.push(sensor);
                            }
                            if (index == result.length - 1) {
                                module.exports.accessories = accessories;
                                //co('info', 'JSON==>  ' + JSON.stringify(accessories));
                                co('info', 'Registrations Vorgang wurde beendet.');
                                callback();
                            }
                        });
                    }
                });
            });
        });
    }, null);
};

/**
 * @return {null}
 */
function AddAccessories(cu) {
    if (cu.homekit_type) {
        var sensor = new Accessory(cu.displayname, cu.id);
        if (cu.homekit_username != null) {
            sensor.username = cu.homekit_username;
        } else {
            sensor.username = makeUserName();
            r.db('HomePuter').table('Data').get(cu.id).update({homekit_username: sensor.username}).run(dbtools.rc);
        }
        co('info', "Username von " + cu.displayname + " " + sensor.username);
        sensor.pincode = glob_pin;
        sensor.inid = cu.id;
        sensor.indisplayName = JSON.stringify(cu.displayName);
        switch (cu.homekit_type) {
            case "Licht":
                co('info', 'Registriere Objekte ' + cu.displayname + ' in HomeKit...');
                switch (cu.state) {
                    case "an":
                        sensor.currentState = true;
                        break;
                    default:
                    case "aus":
                        sensor.currentState = false;
                        break;
                }
                sensor.refreshState = function (callbackx) {
                    r.db('HomePuter').table('Data').get(sensor.inid).run(dbtools.rc, function (err, result) {
                        if (err) {
                            sensor.currentState = false;
                            callbackx();
                        } else {
                            switch (result.state) {
                                case "an":
                                    sensor.currentState = true;
                                    callbackx();
                                    break;
                                default:
                                case "aus":
                                    sensor.currentState = false;
                                    callbackx();
                                    break;
                            }
                        }
                    });
                };
                sensor.addService(Service.Lightbulb).getCharacteristic(Characteristic.On).on('get', function (callback2) {
                    co('info', `GET Anfrage für ${sensor.displayName}`);
                    callback2(null, sensor.currentState);
                }).on('set', function (value, callback2) {
                    co('info', 'SET Befehlt: ' + value);
                    var newstate = 'aus';
                    var next = function () {
                        r.db('HomePuter').table('Data').get(sensor.inid).update({state: newstate}).run(dbtools.rc, function (err, result) {
                            if (err) {
                                callback2();
                            } else {
                                send({x: 'update', id: sensor.inid});
                                co('info', 'Callback');
                                callback2();
                            }
                        });
                    };
                    switch (value) {
                        case true:
                        case 1:
                            newstate = 'an';
                            co('info', 'ANNNNNNN');
                            sensor.currentState = true;
                            next();
                            break;
                        case false:
                        case 0:
                            co('info', 'AUSSSSSS');
                            newstate = 'aus';
                            sensor.currentState = false;
                            next();
                            break;
                    }
                });
                r.db('HomePuter').table('Data').changes().run(dbtools.rc, function (err, re) {
                    re.each(function (err, row) {
                        if (!err) {
                            if (row.new_val.id == sensor.inid) {
                                switch (row.new_val.state) {
                                    case "an":
                                        sensor.currentState = true;
                                        setTimeout(function () {
                                            sensor.getService(Service.Lightbulb).updateCharacteristic(Characteristic.On, sensor.currentState);
                                        }, 500);
                                        break;
                                    default:
                                    case "aus":
                                        sensor.currentState = false;
                                        setTimeout(function () {
                                            sensor.getService(Service.Lightbulb).updateCharacteristic(Characteristic.On, sensor.currentState);
                                        }, 500);
                                        break;
                                }
                            }
                        }
                    });
                });
                return sensor;
                break;
            case "Schalter":
                co('info', 'Registriere Objekte ' + cu.displayname + ' in HomeKit...');
                switch (cu.state) {
                    case "an":
                        sensor.currentState = true;
                        break;
                    default:
                    case "aus":
                        sensor.currentState = false;
                        break;
                }
                sensor.refreshState = function (callbackx) {
                    r.db('HomePuter').table('Data').get(sensor.inid).run(dbtools.rc, function (err, result) {
                        if (err) {
                            sensor.currentState = false;
                            callbackx();
                        } else {
                            switch (result.state) {
                                case "an":
                                    sensor.currentState = true;
                                    callbackx();
                                    break;
                                default:
                                case "aus":
                                    sensor.currentState = false;
                                    callbackx();
                                    break;
                            }
                        }
                    });
                };
                sensor.addService(Service.Switch).getCharacteristic(Characteristic.On).on('get', function (callback2) {
                    co('info', `GET Anfrage für ${sensor.displayName}`);
                    callback2(null, sensor.currentState);
                }).on('set', function (value, callback2) {
                    co('info', "SET Befehl" + value);
                    var newstate = 'aus';
                    var next = function () {
                        r.db('HomePuter').table('Data').get(sensor.inid).update({state: newstate}).run(dbtools.rc, function (err, result) {
                            if (err) {
                                callback2();
                            } else {
                                send({x: 'update', id: sensor.inid});
                                callback2();
                            }
                        });
                    };
                    switch (value) {
                        case true:
                        case 1:
                            newstate = 'an';
                            sensor.currentState = true;
                            co('info', 'ANNNNNNN');
                            next();
                            break;
                        case false:
                        case 0:
                            co('info', 'AUSSSSSS');
                            sensor.currentState = false;
                            newstate = 'aus';
                            next();
                            break;
                    }
                });
                r.db('HomePuter').table('Data').changes().run(dbtools.rc, function (err, re) {
                    re.each(function (err, row) {
                        if (!err) {
                            if (row.new_val.id == sensor.inid) {
                                switch (row.new_val.state) {
                                    case "an":
                                        sensor.currentState = true;
                                        setTimeout(function () {
                                            sensor.getService(Service.Switch).updateCharacteristic(Characteristic.On, sensor.currentState);
                                        }, 500);
                                        break;
                                    default:
                                    case "aus":
                                        sensor.currentState = false;
                                        setTimeout(function () {
                                            sensor.getService(Service.Switch).updateCharacteristic(Characteristic.On, sensor.currentState);
                                        }, 500);
                                        break;
                                }
                            }
                        }
                    });
                });
                return sensor;
                break;
            case "Temperatur":
                co('info', 'Registriere Objekte ' + cu.displayname + ' in HomeKit...');
                sensor.currentTemperature = 0;
                sensor.refreshState = function (call) {
                    r.db('HomePuter').table('Data').get(sensor.inid).run(dbtools.rc, function (err, result) {
                        if (err) {
                            sensor.currentTemperature = 0;
                            call();
                        } else {
                            sensor.currentTemperature = Math.round(result.state.replaceAll(',', '.'));
                            call();
                        }
                    });
                };
                sensor.addService(Service.TemperatureSensor)
                    .getCharacteristic(Characteristic.CurrentTemperature)
                    .on('get', function (callback2) {
                        co('info', `GET Anfrage für ${sensor.displayName}`);
                        callback2(null, sensor.currentTemperature);
                    });
                r.db('HomePuter').table('Data').changes().run(dbtools.rc, function (err, re) {
                    //re.each(console.log);
                    re.each(function (err, row) {
                        if (!err) {
                            if (row.new_val.id == sensor.inid) {
                                co('info', 'Update ' + sensor.displayName);
                                sensor.currentTemperature = Math.round(row.new_val.state.replaceAll(',', '.'));
                                sensor
                                    .getService(Service.TemperatureSensor)
                                    .setCharacteristic(Characteristic.CurrentTemperature, sensor.currentTemperature);
                            }
                        }
                    });
                });
                sensor.refreshState(function () {});
                return sensor;
                break;
            case "Feuchtigkeit":
                co('info', 'Registriere Objekte ' + cu.displayname + ' in HomeKit...');
                sensor.currentTemperature = 0;
                sensor.refreshState = function (call) {
                    r.db('HomePuter').table('Data').get(sensor.inid).run(dbtools.rc, function (err, result) {
                        if (err) {
                            sensor.currentTemperature = 0;
                            call();
                        } else {
                            sensor.currentTemperature = Math.round(result.state.replaceAll(',', '.'));
                            call();
                        }
                    });
                };
                sensor.addService(Service.HumiditySensor)
                    .getCharacteristic(Characteristic.CurrentRelativeHumidity)
                    .on('get', function (callback2) {
                        co('info', `GET Anfrage für ${sensor.displayName}`);
                        callback2(null, sensor.currentTemperature);
                    });
                r.db('HomePuter').table('Data').changes().run(dbtools.rc, function (err, re) {
                    //re.each(console.log);
                    re.each(function (err, row) {
                        if (!err) {
                            if (row.new_val.id == sensor.inid) {
                                co('info', 'Update ' + sensor.displayName);
                                sensor.currentTemperature = Math.round(row.new_val.state.replaceAll(',', '.'));
                                sensor
                                    .getService(Service.HumiditySensor)
                                    .setCharacteristic(Characteristic.CurrentRelativeHumidity, sensor.currentTemperature);
                            }
                        }
                    });
                });
                sensor.refreshState(function () {});
                return sensor;
                break;
            case "Rollladen":
                co('info', 'Registriere Objekte ' + cu.displayname + ' in HomeKit...');
                switch (cu.state) {
                    case "oben":
                        sensor.currentState = 100;
                        sensor.targetPosition = sensor.currentState;
                        break;
                    case "unten":
                        sensor.currentState = 0;
                        sensor.targetPosition = sensor.currentState;
                        break;
                    case "halb":
                        sensor.currentState = 50;
                        sensor.targetPosition = sensor.currentState;
                        break;
                    default:
                        sensor.currentState = 0;
                        sensor.targetPosition = sensor.currentState;
                        break;
                }
                sensor.hoch_makro = cu.hoch_makro;
                sensor.runter_makro = cu.runter_makro;
                sensor.addService(Service.WindowCovering).getCharacteristic(Characteristic.CurrentPosition).on('get', function (callbackget) {
                    co('info', `GET Anfrage (CurrentPosition): ${sensor.displayName} | Current State: ${sensor.currentState}`);
                    rollladen(`GET Anfrage: ${sensor.displayName} | Current State: ${sensor.currentState}`);
                    callbackget(null, sensor.currentState);
                    /*if (!sensor.first){
                     sensor.targetPosition = sensor.currentState;
                     sensor.sendTargetUpdate();
                     sensor.first = true;
                     }
                     /*if (!sensor.first){
                     sensor.first = true;
                     sensor.sendUpdate();
                     }*/
                });
                sensor.getService(Service.WindowCovering).getCharacteristic(Characteristic.TargetPosition).on('get', function (callbackget) {
                    co('info', `GET Anfrage (Target): ${sensor.displayName} | Current Target State: ${sensor.targetPosition}`);
                    rollladen(`GET Anfrage (Target): ${sensor.displayName} | Current Target State: ${sensor.targetPosition}`);
                    callbackget(null, sensor.targetPosition);
                    /*if (!sensor.first){
                     sensor.targetPosition = sensor.currentState;
                     sensor.sendTargetUpdate();
                     sensor.first = true;
                     }*/
                });
                sensor.getService(Service.WindowCovering).getCharacteristic(Characteristic.TargetPosition).on('set', function (value, callbackset) {
                    co('info', `SET Anfrage für ${sensor.displayName}. Wert ==> ${value}`);
                    sensor.targetPosition = value;
                    if (value >= 50) {
                        if (sensor.currentState < 50) {
                            child_process.execFile(`${__dirname}\\..\\..\\ExecStudioCo.exe`, ["R" + sensor.hoch_makro], function (err) {
                                if (err) co('error', err);
                                callbackset();
                                sensor.currentState = sensor.targetPosition;
                                //sensor.sendTargetUpdate();
                            });
                        } else {
                            callbackset();
                            sensor.currentState = sensor.targetPosition;
                            //sensor.sendTargetUpdate();
                        }
                    }
                    if (value < 50) {
                        if (sensor.currentState > 50) {
                            child_process.execFile(`${__dirname}\\..\\..\\ExecStudioCo.exe`, ["R" + sensor.runter_makro], function (err) {
                                if (err) co('error', err);
                                callbackset();
                                sensor.currentState = sensor.targetPosition;
                                //sensor.sendTargetUpdate();
                            });
                        } else {
                            callbackset();
                            sensor.currentState = sensor.targetPosition;
                            //sensor.sendTargetUpdate();
                        }
                    }
                });
                sensor.sendTargetUpdate = function () {
                    sensor
                        .getService(Service.WindowCovering)
                        .updateCharacteristic(Characteristic.CurrentPosition, sensor.targetPosition);
                };
                sensor.sendUpdate = function () {
                    sensor
                        .getService(Service.WindowCovering)
                        .updateCharacteristic(Characteristic.TargetPosition, sensor.currentState);
                    sensor
                        .getService(Service.WindowCovering)
                        .updateCharacteristic(Characteristic.CurrentPosition, sensor.currentState);
                };
                r.db('HomePuter').table('Data').changes().run(dbtools.rc, function (err, re) {
                    re.each(function (err, row) {
                        if (!err) {
                            if (row.new_val.id == sensor.inid) {
                                co('info', 'Update ' + sensor.displayName);
                                switch (row.new_val.state) {
                                    case "oben":
                                        sensor.currentState = 100;
                                        sensor.targetPosition = sensor.currentState;
                                        //setTimeout(function () {
                                        sensor.sendUpdate();
                                        //}, 500);
                                        break;
                                    case "unten":
                                        sensor.currentState = 0;
                                        sensor.targetPosition = sensor.currentState;
                                        //setTimeout(function () {
                                        sensor.sendUpdate();
                                        //}, 500);
                                        break;
                                    case "halb":
                                        sensor.currentState = 50;
                                        sensor.targetPosition = sensor.currentState;
                                        sensor.sendUpdate();
                                        break;
                                    default:
                                        sensor.currentState = 0;
                                        sensor.targetPosition = sensor.currentState;
                                        //setTimeout(function () {
                                        sensor.sendUpdate();
                                        //}, 500);
                                        break;
                                }
                            }
                        }
                    });
                });
                //sensor.targetPosition = sensor.currentState;
                //sensor.sendTargetUpdate();
                return sensor;
                break;
            default:
                return null;
                break;
        }
    }
}

String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

function randomCharOrInt() {
    var text = "";
    var possible = "C23DEF67";
    text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function makeUserName() {
    var temp = '';
    for (var i = 0; i < 6; i++) {
        temp += randomCharOrInt();
        temp += randomCharOrInt();
        if (i != 5) {
            temp += ':';
        }
    }
    return temp;
}