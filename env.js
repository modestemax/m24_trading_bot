const debug = require('debug');
const _ = require('lodash');
const log = require('log-to-file');


const apijson = process.env.HOME + '/.api.json';
const api = require(apijson);

const env = process.env;

global.env = module.exports = {
    EXCHANGE: env.EXCHANGE || 'binance',
    BTCQTY: env.BTCQTY || 0,
    TIMEFRAME: env.TIMEFRAME || 15,
    APIKEY: api.api_key,
    SECRET: api.secret,
    isProduction: env.NODE_ENV === 'production'
};
env.BTCQTY = env.isProduction ? env.BTCQTY : 1;

global.debug = console.debug.bind(console);

global.log = _.wrap(_.bind(log, null, _, `logs/${global.env.EXCHANGE}_${global.env.TIMEFRAME}_${new Date().toLocaleString()}.txt`), (log, txt, debug) => {
    log(txt);
    debug && debug(txt);
});
global.log('m24 started');