// require('../env')
const formatError = require('format-error').format;


const env = {
    PRODUCTION: !!process.env.PRODUCTION,
    TIMEFRAME: process.env.TIMEFRAME || 5,
    TIMEFRAMES: (process.env.TIMEFRAMES || '5,15,60').split(','),
    QUOTE_CUR: process.env.QUOTE_CUR || 'BTC',
    EXCHANGE: process.env.EXCHANGE || 'binance',
    STRATEGY: process.env.STRATEGY || 'MAX05',
    timeframesIntervals: {
        5: 5 * 60e3,
        15: 15 * 60e3,
        60: 60 * 60e3,
        240: 240 * 60e3,
        [60 * 24]: 60 * 24 * 60e3,
    },
};
const appEmitter = new class extends (require('events')) {
    constructor() {
        super();
        process.on('uncaughtException', (err) => {
            console.error(`m24->\nUncaught Exception ${formatError(err)}`, console.error);
            this.emitException(err);
        });

        process.on('unhandledRejection', (reason, p) => {
            console.error(`m24->\nUnhandled Rejection  ${formatError(reason)}`, console.error);
            this.emitException(reason);
        });
    }

    emitException(ex) {
        console.log(ex, console.error);
        appEmitter.emit('app:error', ex);
    }

    emitMessage(ex) {
        console.log(ex, console.log);
        appEmitter.emit('app:msg', ex);
    }
}();


require('../indicators-builder/signals')({ env, appEmitter });
require('../analyse')({ env, appEmitter });
require('../indicators-builder/saveIndicator')({ env, appEmitter });