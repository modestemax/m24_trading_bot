const apps = [

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
    // }, {
    //     name: 'bot_btc_max_45',
    //     script: 'app.js',
    //     "exec_mode": "cluster",
    //     cwd: 'trading',
    //     // "node_args": "--inspect=0.0.0.0:5858",
    //     env: {
    //         DEBUG: '*',
    //         // DESC: 'BTC Target 1.1 Stop -2',
    //         QUOTE_CUR: 'BTC', EXCHANGE: 'binance', TIMEFRAME: 5, API_KEY: 'keys', BOT_ID: 'm1', MAX01: 'true',
    //         PORT: 12345,
    //         MIN_COUNT: 2,
    //         SIMUL_FIRST_ENTRY: '',
    //         NO_STOP_LOSS: 'true',
    //         EXIT_ON_TARGET: '',
    //         STRATEGY: "Max",
    //         STOP_LOSS_PERCENT: -2,
    //         SELL_LIMIT_PERCENT: 1.1,
    //         QUOTE_CUR_QTY: .006,
    //         TIMEFRAMES: '5,15,60'
    //     },
    //     env_production: {
    //         NODE_ENV: 'production'
    //     }
    // },
    {
        name: 'bot_btc_max_55',
        script: 'app.js',
        "exec_mode": "cluster",
        cwd: 'trading',
        // "node_args": "--inspect=0.0.0.0:5858",
        env: {
            DEBUG: '*',
            // DESC: 'BTC Target 1.1 Stop -2',
            QUOTE_CUR: 'BTC', EXCHANGE: 'binance', TIMEFRAME: 5, API_KEY: 'keys', BOT_ID: 'h1', MAX02: 'true',
            PORT: 12355,
            NO_STOP_LOSS: 'true',
            STRATEGY: "HFT",
            STOP_LOSS_PERCENT: -0.5,
            SELL_LIMIT_PERCENT: 2,
            QUOTE_CUR_QTY: .006,
            TIMEFRAMES: '5'
        },
        env_production: {
            NODE_ENV: 'production'
        }
    },
    // {
    //     name: 'bot_eth_45',
    //     script: 'app.js',
    //     "exec_mode": "cluster",
    //     cwd: 'trading',
    //     "node_args": "--inspect=0.0.0.0:5859",
    //     env: {
    //         DEBUG: '*',
    //         // DESC: 'BTC Target 0.6 Stop -1.5',
    //         QUOTE_CUR: 'ETH', EXCHANGE: 'binance', TIMEFRAME: 15, API_KEY: 'keys', BOT_ID: 'tv02',
    //         PORT: 12345,
    //         MIN_COUNT: 2,
    //         NO_STOP_LOSS: 'true',
    //         STRATEGY: "ValKeys",
    //         STOP_LOSS_PERCENT: -10,
    //         SELL_LIMIT_PERCENT: 15,
    //         QUOTE_CUR_QTY: .06
    //     },
    //     env_production: {
    //         NODE_ENV: 'production'
    //     }
    // },
    //
    // {
    //     name: 'bot_usdt_56',
    //     script: 'app.js',
    //     "exec_mode": "cluster",
    //     cwd: 'trading',
    //     "node_args": "--inspect=0.0.0.0:5858",
    //     env: {
    //         DEBUG: '*',
    //         // DESC: 'USDT Target 1.1 Stop -2',
    //         QUOTE_CUR: 'USDT', EXCHANGE: 'binance', TIMEFRAME: 15, API_KEY: 'keys', BOT_ID: 'tv02',
    //         PORT: 12356,
    //         MIN_COUNT: 2,
    //         STRATEGY: "ValKeys",
    //         NO_STOP_LOSS: 'true',
    //         STOP_LOSS_PERCENT: -10,
    //         SELL_LIMIT_PERCENT: 15,
    //         QUOTE_CUR_QTY: 100
    //     },
    //     env_production: {
    //         NODE_ENV: 'production'
    //     }
    // },
    // {
    //     name: 'bot_bnb_55',
    //     script: 'app.js',
    //     "exec_mode": "cluster",
    //     cwd: 'trading',
    //     "node_args": "--inspect=0.0.0.0:5859",
    //     env: {
    //         DEBUG: '*',
    //         // DESC: 'BTC Target 0.6 Stop -1.5',
    //         QUOTE_CUR: 'BNB', EXCHANGE: 'binance', TIMEFRAME: 15, API_KEY: 'keys',
    //         PORT: 12355,
    //         MIN_COUNT: 2,
    //         NO_STOP_LOSS: 'true',
    //         STRATEGY: "ValKeys",
    //         STOP_LOSS_PERCENT: -10,
    //         SELL_LIMIT_PERCENT: 15,
    //         QUOTE_CUR_QTY: 20
    //     },
    //     env_production: {
    //         NODE_ENV: 'production'
    //     }
    // },

].map(app => {
    app.env.DESC = `Quote: ${app.env.QUOTE_CUR} Target: ${app.env.SELL_LIMIT_PERCENT} stop: ${app.env.SELL_LIMIT_PERCENT}`;
    app.env.DESC += ' Trade based on ' + (app.env.STRATEGY)
    return app;
});


module.exports = {
    /**
     * Application configuration section
     * http://pm2.keymetrics.io/docs/usage/application-declaration/
     */
    apps,

    /**
     * Deployment section
     * http://pm2.keymetrics.io/docs/usage/deployment/
     */
    deploy: {
        production: {
            "key": "/home/max/.ssh/keysvirginia.pem",
            user: 'ubuntu',
            host: '34.229.181.14',
            ref: 'origin/master',
            repo: ' https://github.com/modestemax/m24_trading_bot.git',
            path: '/home/ubuntu/bot/prod',
            'post-deploy': 'pm2 reload ecosystem.config.js --env production'
        },
        dev: {
            "key": "/home/max/.ssh/keysvirginia.pem",
            user: 'ubuntu',
            host: '34.229.181.14',
            ref: 'origin/master',
            repo: ' https://github.com/modestemax/m24_trading_bot.git',
            path: '/home/ubuntu/bot/dev',
            'post-deploy': 'pm2 delete ecosystem.config.js && pm2 reload ecosystem.config.js --env dev',
            // 'post-deploy': 'pm2 reload ecosystem.config.js --env dev',
            // 'post-deploy': 'pm2 restart bot_btc_val_46',
            env: {
                NODE_ENV: 'dev'
            }
        }
    }
};
