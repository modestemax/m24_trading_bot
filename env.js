const debug = require('debug');
const _ = require('lodash');
const log = require('log-to-file');
var redis = require('redis').createClient();

const apijson = process.env.HOME + '/.api.json';
// const api = require(apijson).max;
const api = require(apijson).key;

const envVar = _.pick(process.env, ['EXCHANGE', 'TIMEFRAME', 'QUOTE_CUR', 'QUOTE_CUR_QTY', 'STOP_LOSS_PERCENT', 'TRADE_RATION', 'TRAILING_CHANGE_PERCENT']);

const rKey = envVar.EXCHANGE + envVar.TIMEFRAME  + envVar.QUOTE_CUR;

module.exports = new Promise((resolve, reject) => {

    redis.get(rKey, (err, data) => {
        let env = {};
        if (!err) {
            env = JSON.parse(data);
        }
        env = Object.assign({}, env, envVar);
        redis.set(rKey, JSON.stringify(env), (err, res) => {
            if (!err) {
                global.env = {
                    EXCHANGE: env.EXCHANGE,
                    QUOTE_CUR_QTY: env.QUOTE_CUR_QTY || .006,
                    QUOTE_CUR: env.QUOTE_CUR,
                    STOP_LOSS_PERCENT: env.STOP_LOSS_PERCENT || -1,
                    TRADE_RATION: env.TRADE_RATION || 40 / 100,
                    TRAILING_CHANGE_PERCENT: env.TRAILING_CHANGE_PERCENT || .3,
                    TIMEFRAME: env.TIMEFRAME || 15,
                    APIKEY: api.api_key,
                    SECRET: api.secret,
                    isProduction: envVar.NODE_ENV === 'production'
                }
                // isProduction: true// envVar.NODE_ENV === 'production'

// env.BTCQTY = env.isProduction ? env.BTCQTY : .006;
                env.FEE_CUR = env.EXCHANGE === 'binance' ? 'BNB' : '';
                resolve(env);
                global.debug = console.debug.bind(console);
                global.redis = redis;

                global.log = _.wrap(_.bind(log, null, _, `logs/${global.env.EXCHANGE}_${global.env.TIMEFRAME}_${new Date().toLocaleString()}.txt`), (log, txt, debug) => {
                    log(txt);
                    debug && debug(txt);
                });
                global.log('m24 started');
            }

        })
    });

});
