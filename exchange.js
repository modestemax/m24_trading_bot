const _ = require('lodash');
require('./exchanges/binance');

appEmitter.on('exchange:buy', symbolData => {
    let exchange = loadExchange(symbolData.exchange);
    exchange.buy(symbolData)
        .then((order) => appEmitter.emit('exchange:bought:' + symbolData.symbol, order))
        .catch((error) => appEmitter.emit('exchange:buy-error:' + symbolData.symbol, error))
});

appEmitter.on('exchange:sell', symbolData => {
    let exchange = loadExchange(symbolData.exchange);
    exchange.sell(symbolData)
        .then((order) => appEmitter.emit('exchange:sold:' + symbolData.symbol, order))
        .catch((error) => appEmitter.emit('exchange:sell-error:' + symbolData.symbol, error))
});

function loadExchange(exchange) {
    // return require('./exchanges/' + exchange);

    return {
        buy: async (data) => ({price: data.close}),
        sell: async (data) => ({price: data.close}),
    }
}

appEmitter.on('binance:tickers', tickers => {
    //debugger
    appEmitter.emit('exchange:tickers', 'binance',tickers);
})