const debug = require('debug');
const _ = require('lodash');


const apijson = process.env.HOME + '/.api.json';
// const api = require(apijson).max;


const { QUOTE_CUR_QTY, START_TRADE_BUY_PERCENT, TRADING_STRATEGY, SELL_LIMIT_PERCENT, MAX_WAIT_TRADE_TIME, MAX_WAIT_BUY_TIME, STOP_LOSS_PERCENT, TRADE_RATIO, TRAILING_CHANGE_PERCENT, NODE_ENV } = process.env;

const api = require(apijson)[appStartupParams.API_KEY];

module.exports = Model.Settings.load().then(async settings => {
    settings = _.defaults({
            QUOTE_CUR_QTY,
            START_TRADE_BUY_PERCENT,
            TRADING_STRATEGY,
            SELL_LIMIT_PERCENT,
            MAX_WAIT_TRADE_TIME,
            MAX_WAIT_BUY_TIME,
            STOP_LOSS_PERCENT,
            TRADE_RATIO,
            TRAILING_CHANGE_PERCENT,
            // PRODUCTION:true,// NODE_ENV === 'production',
            PRODUCTION: false,// NODE_ENV === 'production',
            // PRODUCTION:NODE_ENV === 'production',
            NO_TRADE_CUR: (() => {
                    let no_trade = [];
                    switch (appStartupParams.EXCHANGE) {
                        case  'BINANCE':
                            no_trade = ['BNB'/*,'USDT'*/];
                            break;
                    }
                    return no_trade;
                }
            )()

        }, appStartupParams, settings,
        {
            QUOTE_CUR_QTY: .006,
            START_TRADE_BUY_PERCENT: 0.2,//-.4,
            // TRADING_STRATEGY:'TRAILLING_STOP_LOSS',
            TRADING_STRATEGY: 'SELL_LIMIT',
            SELL_LIMIT_PERCENT: 1.1,
            MAX_WAIT_BUY_TIME: 60 * 1e3, //1 min
            MAX_WAIT_TRADE_TIME: 3600 * 1e3, //1 hour
            STOP_LOSS_PERCENT: -1,
            TRADE_RATIO: 40 / 100,
            TRAILING_CHANGE_PERCENT: .5
        });

    if (settings['pd-sid']) {
        await Model.Settings.modify(settings);
    } else {
        await Model.Settings.create(settings);
    }

    global.env = _.extend(settings, {
        APIKEY: api.api_key,
        SECRET: api.secret
    });

    global.env.TIMEFRAMES = [
        // env.TIMEFRAME
        5,
        15,
        60,
        240,
        // '1D',
    ];
    return settings;
});
