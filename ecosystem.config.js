const apps = [

    // First application
    {
        name: 'bot_btc_46',
        script: 'app.js',
        "exec_mode": "cluster",
        cwd: 'trading',
        "node_args": "--inspect=0.0.0.0:5858",
        env: {
            DEBUG1: '*',
            // DESC: 'BTC Target 1.1 Stop -2',
            QUOTE_CUR: 'BTC', EXCHANGE: 'binance', TIMEFRAME: 5, API_KEY: 'keys', BOT_ID: 'tv02',
            PORT: 12346,
            MIN_COUNT: 2,
            SIMUL_FIRST_ENTRY: '',
            NO_STOP_LOSS1: 'true',
            STOP_LOSS_PERCENT: -2,
            TRADE_ON_EMA_CROSS: true,
            SELL_LIMIT_PERCENT: 1.1,
            QUOTE_CUR_QTY: .006,
        },
        env_production: {
            NODE_ENV: 'production'
        }
    },
    {
        name: 'bot_btc_45',
        script: 'app.js',
        "exec_mode": "cluster",
        cwd: 'trading',
        "node_args": "--inspect=0.0.0.0:5859",
        env: {
            DEBUG1: '*',
            // DESC: 'BTC Target 0.6 Stop -1.5',
            QUOTE_CUR: 'BTC', EXCHANGE: 'binance', TIMEFRAME: 5, API_KEY: 'keys', BOT_ID: 'tv02',
            PORT: 12345,
            MIN_COUNT: 2,
            NO_STOP_LOSS1: 'true',
            STOP_LOSS_PERCENT: -1.5,
            TRADE_ON_EMA_CROSS: true,
            SELL_LIMIT_PERCENT: .6,
            QUOTE_CUR_QTY: .006
        },
        env_production: {
            NODE_ENV: 'production'
        }
    },

    {
        name: 'bot_usdt_56',
        script: 'app.js',
        "exec_mode": "cluster",
        cwd: 'trading',
        "node_args": "--inspect=0.0.0.0:5858",
        env: {
            DEBUG1: '*',
            // DESC: 'USDT Target 1.1 Stop -2',
            QUOTE_CUR: 'USDT', EXCHANGE: 'binance', TIMEFRAME: 240, API_KEY: 'keys', BOT_ID: 'tv02',
            PORT: 12356,
            MIN_COUNT: 2,
            TRADE_ON_EMA_CROSS: true,
            NO_STOP_LOSS: 'true',
            STOP_LOSS_PERCENT: -2,
            SELL_LIMIT_PERCENT: 1.1,
            QUOTE_CUR_QTY: 100
        },
        env_production: {
            NODE_ENV: 'production'
        }
    },
    {
        name: 'bot_btc_55',
        script: 'app.js',
        "exec_mode": "cluster",
        cwd: 'trading',
        "node_args": "--inspect=0.0.0.0:5859",
        env: {
            DEBUG1: '*',
            // DESC: 'BTC Target 0.6 Stop -1.5',
            QUOTE_CUR: 'BTC', EXCHANGE: 'binance', TIMEFRAME: 5, API_KEY: 'keys',
            PORT: 12355,
            MIN_COUNT: 2,
            NO_STOP_LOSS: 'true',
            STOP_LOSS_PERCENT: -1.5,
            SELL_LIMIT_PERCENT: .6,
            QUOTE_CUR_QTY: .006
        },
        env_production: {
            NODE_ENV: 'production'
        }
    },

].map(app => {
    app.env.DESC = `Quote: ${app.env.QUOTE_CUR} Target: ${app.env.SELL_LIMIT_PERCENT} stop: ${app.env.SELL_LIMIT_PERCENT}`;
    app.env.DESC += ' Trade based on ' + (app.env.TRADE_ON_EMA_CROSS ? 'EMA Crossing' : 'Trend')
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
            env: {
                NODE_ENV: 'dev'
            }
        }
    }
};
