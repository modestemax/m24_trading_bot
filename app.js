require('./env');
require('./events');
require('./exchange').then((exchange) => {
    global.exchange = exchange;
    require('./utils');
    require('./signals');
    require('./analyse');
    require('./trade');
});

