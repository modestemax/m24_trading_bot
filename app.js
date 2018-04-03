require('./env').then(() => {
    require('./events');
    require('./exchange').then((exchange) => {
        require('./utils');
        require('./signals');
        require('./analyse');
        require('./trade');
        require('./pub_sub');
    });
});


process.on('uncaughtException', (err) => {
    log(`hdf Uncaught Exception ${err.message} ${ err.stack || 'no stack'}`, debug)
    appEmitter.emit('app:error', err);
});

process.on('unhandledRejection', (reason, p) => {
    log(`Unhandled Rejection at: Promise: ${JSON.stringify(p)}\n\nreason: ${JSON.stringify(reason)}`, debug);
    appEmitter.emit('app:error', reason);
});
