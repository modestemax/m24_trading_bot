const _ = require('lodash');
const logToFile = require('log-to-file');
const EventEmitter = require('events');
const path = require('path');
const mkdirp = require('mkdirp');
const fs = require('fs');
const emitter = new EventEmitter();
const formatError = require('format-error').format;

emitter.setMaxListeners(Infinity);
global.appEmitter = module.exports = emitter;

const logFile = path.resolve(`logs/${global.appKey}_${new Date().toLocaleString()}.txt`);
mkdirp.sync(path.dirname(logFile));

global.log = _.wrap(_.bind(logToFile, null, _, logFile),
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
    log(`m24->\nUncaught Exception ${formatError(err)}`, console.error);
    emitException(err);
});

process.on('unhandledRejection', (reason, p) => {
    log(`m24->\nUnhandled Rejection  ${formatError(reason)}`, console.error);
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

