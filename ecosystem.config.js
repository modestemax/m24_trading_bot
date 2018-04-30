module.exports = {
    /**
     * Application configuration section
     * http://pm2.keymetrics.io/docs/usage/application-declaration/
     */
    apps: [

        // First application
        {
            name: 'bot_btc_46',
            script: 'app.js',
            "exec_mode": "cluster",
            cwd: 'trading',
            "node_args": "--inspect=0.0.0.0:5858",
            env: {
                DEBUG1: '*',
                QUOTE_CUR: 'BTC', EXCHANGE: 'binance', TIMEFRAME: 240, API_KEY: 'keys',
                PORT: 12346,
                MIN_COUNT: 2,
                SIMUL_FIRST_ENTRY:'' ,
                NO_STOP_LOSS: 'true',
                STOP_LOSS_PERCENT: -1.5,
                TRENDING_UP: true,
                SELL_LIMIT_PERCENT: 1.1,
                QUOTE_CUR_QTY:.006,
            },
            env_production: {
                NODE_ENV: 'production'
            }
        },
        // {
        //     name: 'bot_btc_45',
        //     script: 'app.js',
        //     "exec_mode": "cluster",
        //     cwd: 'trading',
        //     "node_args": "--inspect=0.0.0.0:5859",
        //     env: {
        //         DEBUG1: '*',
        //         QUOTE_CUR: 'BTC', EXCHANGE: 'binance', TIMEFRAME: 5, API_KEY: 'keys',
        //         PORT: 12345,
        //         MIN_COUNT: 2,
        //         NO_STOP_LOSS: 'true',
        //         STOP_LOSS_PERCENT: -1,
        //         TRENDING_UP: true,
        //         SELL_LIMIT_PERCENT: .6,
        //         QUOTE_CUR_QTY:.006
        //     },
        //     env_production: {
        //         NODE_ENV: 'production'
        //     }
        // },

        {
            name: 'bot_usdt_56',
            script: 'app.js',
            "exec_mode": "cluster",
            cwd: 'trading',
            "node_args": "--inspect=0.0.0.0:5858",
            env: {
                DEBUG1: '*',
                QUOTE_CUR: 'USDT', EXCHANGE: 'binance', TIMEFRAME: 240, API_KEY: 'keys',
                PORT: 12356,
                MIN_COUNT: 2,
                SIMUL_FIRST_ENTRY:'' ,
                NO_STOP_LOSS: 'true',
                STOP_LOSS_PERCENT: -1.5,
                SELL_LIMIT_PERCENT: 1.1,
                QUOTE_CUR_QTY:100
            },
            env_production: {
                NODE_ENV: 'production'
            }
        },
        // {
        //     name: 'bot_usdt_55',
        //     script: 'app.js',
        //     "exec_mode": "cluster",
        //     cwd: 'trading',
        //     "node_args": "--inspect=0.0.0.0:5859",
        //     env: {
        //         DEBUG1: '*',
        //         QUOTE_CUR: 'BTC', EXCHANGE: 'binance', TIMEFRAME: 5, API_KEY: 'keys',
        //         PORT: 12355,
        //         MIN_COUNT: 2,
        //         NO_STOP_LOSS: 'true',
        //         STOP_LOSS_PERCENT: -1,
        //         SELL_LIMIT_PERCENT: .6,
        //         QUOTE_CUR_QTY:100
        //     },
        //     env_production: {
        //         NODE_ENV: 'production'
        //     }
        // },

    ],

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
