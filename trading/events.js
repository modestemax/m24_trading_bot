const _ = require('lodash');
const logToFile = require('log-to-file');
const EventEmitter = require('events');
const emitter = new EventEmitter();

global.appEmitter = module.exports = emitter;

global.log = _.wrap(_.bind(logToFile, null, _, `logs/${global.appKey}_${new Date().toLocaleString()}.txt`),
    (log, txt, debug) => {
        log(txt);
        debug && debug(txt);
        console.debug(txt);
    });

global.log('m24 started with key ' + appKey);
global.debug = console.debug.bind(console);

global.emitException = function (ex) {
    log(ex, console.error);
    appEmitter.emit('app:error', ex);
};


process.on('uncaughtException', (err) => {
    log(`hdf Uncaught Exception ${err.message} ${ err.stack || 'no stack'}`, console.error);
    emitException(err);
});

process.on('unhandledRejection', (reason, p) => {
    log(`Unhandled Rejection at: Promise: ${p && p.toString()}\n\nreason: ${reason && reason.toString()}`, console.error);
    emitException(reason);
});


process.stdin.on('message', (reason, p) => {
    debugger
    emitException(reason);
});
process.stdin.on('data', (reason, p) => {
    if (/error/i.test(reason.toString())) {
        emitException("Sample Error");
    }
    if (/trades/i.test(reason.toString())) {
        appEmitter('test:trade', true)
    }
    if (/tradee/i.test(reason.toString())) {
        appEmitter('test:trade', null, true)
    }
    debugger
    emitException(reason);
});

