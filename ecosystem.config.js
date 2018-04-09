module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps : [

    // First application
    {
      name      : 'API',
      script    : 'trading/app.js',
      env: {
        COMMON_VARIABLE: 'true'
      },
      env_production : {
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
  deploy : {
    production : {
        "key": "/home/max/.ssh/keysvirginia.pem",
      user : 'ubuntu',
      host : '34.229.181.14',
      ref  : 'origin/master',
      repo : ' https://github.com/modestemax/m24_trading_bot.git',
      path : '/var/www/production',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production'
    },
    dev : {
        "key": "/home/max/.ssh/keysvirginia.pem",
      user : 'ubuntu',
      host : '34.229.181.14',
      ref  : 'origin/master',
      repo : ' https://github.com/modestemax/m24_trading_bot.git',
      path : '/var/www/development',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env dev',
      env  : {
        NODE_ENV: 'dev'
      }
    }
  }
};
