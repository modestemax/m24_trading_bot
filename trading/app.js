require('./override');
(async (env) => {
    let { EXCHANGE, TIMEFRAME, QUOTE_CUR, API_KEY, BOT_ID } = env;
    try {
        const _ = require('lodash');
        BOT_ID = BOT_ID || '';
        if (EXCHANGE && TIMEFRAME && QUOTE_CUR && API_KEY) {
            global.appStartupParams = _.mapValues({ EXCHANGE, TIMEFRAME, QUOTE_CUR, API_KEY }, v => v.toUpperCase());
            ({ EXCHANGE, TIMEFRAME, QUOTE_CUR } = appStartupParams);
            global.appKey = `${EXCHANGE}:${TIMEFRAME}:${QUOTE_CUR}:${BOT_ID}:`;
            require('./events');

            // await   require('./store');
            await require('./env');
            global.exchange = await require('./exchange');

            require('./utils')(global.exchange);
            require('./signals');
            require('./analyse');
            require('./trade');
            require('./pub_sub');
            require('./admin_interface');
        } else {
            console.error(EXCHANGE, TIMEFRAME, QUOTE_CUR, API_KEY)
        }
    }
    catch
        (ex) {
        console.error('Load ' + EXCHANGE + ' Error\n', ex);
        process.exit(1);
    }

})(process.env);