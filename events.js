const _ = require('lodash');
const log = require('log-to-file');
const EventEmitter = require('events');
const emitter = new EventEmitter();

global.appEmitter = module.exports = emitter;

global.log = _.wrap(_.bind(log, null, _, `logs/${global.appKey}_${new Date().toLocaleString()}.txt`),
    (log, txt, debug) => {
        log(txt);
        debug && debug(txt);
        console.debug(txt);
    });

global.log('m24 started with key ' + appKey);
global.debug = console.debug.bind(console);

process.on('uncaughtException', (err) => {
    log(`hdf Uncaught Exception ${err.message} ${ err.stack || 'no stack'}`, debug)
    appEmitter.emit('app:error', err);
});

process.on('unhandledRejection', (reason, p) => {
    log(`Unhandled Rejection at: Promise: ${JSON.stringify(p)}\n\nreason: ${JSON.stringify(reason)}`, debug);
    appEmitter.emit('app:error', reason);
});
