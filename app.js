require('./env');
require('./events');
require('./exchange').then((exchange) => {
    require('./utils');
    require('./signals');
    require('./analyse');
    require('./trade');
});


process.on('uncaughtException', (err) => {
    log(`hdf Uncaught Exception ${err.message} ${ err.stack || 'no stack'}`,debug)
    // process.exit(1);
});

process.on('unhandledRejection', (reason, p) => {
    log(`Unhandled Rejection at: Promise: ${JSON.stringify(p)}\n\nreason: ${JSON.stringify(reason)}`,debug);
    // process.exit(1);
});
