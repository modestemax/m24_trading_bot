const debug = require('debug');
const _ = require('lodash');
const log = require('log-to-file');


const apijson = process.env.HOME + '/.api.json';
// const api = require(apijson).max;
const api = require(apijson).key;

const envVar = process.env;

global.env = module.exports = {
    EXCHANGE: envVar.EXCHANGE || 'binance',
    BTCQTY: envVar.BTCQTY || .006,
    TIMEFRAME: envVar.TIMEFRAME || 15,
    APIKEY: api.api_key,
    SECRET: api.secret,
    // isProduction: envVar.NODE_ENV === 'production'
    isProduction: true// envVar.NODE_ENV === 'production'
};
// env.BTCQTY = env.isProduction ? env.BTCQTY : .006;

global.debug = console.debug.bind(console);

global.log = _.wrap(_.bind(log, null, _, `logs/${global.env.EXCHANGE}_${global.env.TIMEFRAME}_${new Date().toLocaleString()}.txt`), (log, txt, debug) => {
    log(txt);
    debug && debug(txt);
});
global.log('m24 started');