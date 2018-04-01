const debug = require('debug');
const _ = require('lodash');
const log = require('log-to-file');


const apijson = process.env.HOME + '/.api.json';
// const api = require(apijson).max;
const api = require(apijson).key;

const envVar = process.env;

global.env = module.exports = {
    EXCHANGE: envVar.EXCHANGE || 'binance',
    QUOTE_CUR_QTY: envVar.QUOTE_CUR_QTY || .006,
    QUOTE_CUR: envVar.QUOTE_CUR || 'BTC',
    STOP_LOSS_PERCENT: envVar.STOP_LOSS_PERCENT || -1,
    TRADE_RATION: envVar.TRADE_RATION || 40 / 100,
    TRAILING_CHANGE_PERCENT: envVar.TRAILING_CHANGE_PERCENT || .3,
    TIMEFRAME: envVar.TIMEFRAME || 15,
    APIKEY: api.api_key,
    SECRET: api.secret,
    isProduction: envVar.NODE_ENV === 'production'
    // isProduction: true// envVar.NODE_ENV === 'production'
};
// env.BTCQTY = env.isProduction ? env.BTCQTY : .006;
env.FEE_CUR = env.EXCHANGE === 'binance' ? 'BNB' : '';

global.debug = console.debug.bind(console);

global.log = _.wrap(_.bind(log, null, _, `logs/${global.env.EXCHANGE}_${global.env.TIMEFRAME}_${new Date().toLocaleString()}.txt`), (log, txt, debug) => {
    log(txt);
    debug && debug(txt);
});
global.log('m24 started');