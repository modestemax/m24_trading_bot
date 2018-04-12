module.exports = {
    /**
     * Application configuration section
     * http://pm2.keymetrics.io/docs/usage/application-declaration/
     */
    apps: [

        // First application
        {
            name: 'bot',
            script: 'trading/app.js',
            "node_args": "--inspect=0.0.0.0:5858",
            env: {
                DEBUG: '*',
                QUOTE_CUR: 'BTC', EXCHANGE: 'binance', TIMEFRAME: 15, API_KEY: 'keys'
            },
            env_production: {
                NODE_ENV: 'production'
            }
        },

        // Second application
        // {
        //   name      : 'WEB',
        //   script    : 'web.js'
        // }
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
            'post-deploy': 'pm2 reload ecosystem.config.js --env dev',
            env: {
                NODE_ENV: 'dev'
            }
        }
    }
};
