const _ = require('./trading/node_modules/lodash');

const apps = [
    {
        name: 'MAX01',
        active: false,
        env: {
            PORT: 12311,
            STRATEGY: "STOCHASTIC RSI",
        },
    },
    {
        name: 'MAX02',
        env: {
            PUMP: 'v0',
            PORT: 12312,
            STRATEGY: "Pumping v0 1% 1min",
        },
    },
    {
        name: 'MAX03',
        env: {
            PORT: 12313,
            STRATEGY: "EMA + RSI",
        },
    },
    {
        name: 'MAX04',
        env: {
            PUMP: 'v2',
            PORT: 12314,
            STRATEGY: "Pumping v2 + RSI",
        },
    },
    {
        name: 'MAX05',
        env: {
            PORT: 12315,
            STRATEGY: "RSI",
        },
    },

].filter(a => a.active !== false).map(app => {
    _.defaultsDeep(app,
        {
            script: 'app.js',
            "exec_mode": "cluster",
            cwd: 'trading',
            env: {
                [app.name]: true,
                DEBUG: '*',
                QUOTE_CUR: 'BTC',
                EXCHANGE: 'binance',
                TIMEFRAME: 5,
                API_KEY: 'keys',
                // BOT_ID: 'm17',
                STOP_LOSS_PERCENT: -2,
                SELL_LIMIT_PERCENT: 1.1,
                QUOTE_CUR_QTY: .006,
                TIMEFRAMES: '5,15,60',
            },
            env_production: {
                NODE_ENV: 'production'
            }
        });
    return _.defaultsDeep(app, {
        env: {
            DESC: `Name: ${app.name} Quote: ${app.env.QUOTE_CUR} Target: ${app.env.SELL_LIMIT_PERCENT} stop: ${app.env.SELL_LIMIT_PERCENT} 
                Trade based on ${app.env.STRATEGY}`
        }
    })
});


module.exports = apps;


// First application
// {
//     name: 'bot_btc_val_46',
//     script: 'app.js',
//     "exec_mode": "cluster",
//     cwd: 'trading',
//     // "node_args": "--inspect=0.0.0.0:5858",
//     env: {
//         DEBUG: '*',
//         // DESC: 'BTC Target 1.1 Stop -2',
//         QUOTE_CUR: 'BTC', EXCHANGE: 'binance', TIMEFRAME: 15, API_KEY: 'keys', BOT_ID: 'v1', VAL01: 'true',
//         PORT: 12346,
//         MIN_COUNT: 2,
//         SIMUL_FIRST_ENTRY: '',
//         NO_STOP_LOSS: 'true',
//         EXIT_ON_TARGET: '',
//         STRATEGY: "ValKeys",
//         STOP_LOSS_PERCENT: -2,
//         SELL_LIMIT_PERCENT: 1.1,
//         QUOTE_CUR_QTY: .006,
//         TIMEFRAMES: '5,15,60'
//     },
//     env_production: {
//         NODE_ENV: 'production'
//     }
// },