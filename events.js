const EventEmitter = require('events');
const emitter = new EventEmitter();

global.appEmitter = module.exports = emitter;