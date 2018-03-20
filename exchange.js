const _ = require('lodash');
const ccxt = require('ccxt');

let {APIKEY, SECRET} = env;
const {getChangePercent, updatePrice} = require('./utils');

const exchangeId = env.EXCHANGE;
const STOP_LOSS_BUY_PERCENT = .35;
let BTCQTY = env.BTCQTY;//todo

loadExchange(exchangeId).then(function ({exchange, internal}) {
    let {exchangeEmitter} = internal
    appEmitter.on('trade:buy', ({symbol, lastPice, ratio}) => {

        internal.buyMarket({symbol, lastPice, ratio, totalBTC: BTCQTY})
            .then(
                (order) => appEmitter.emit('exchange:buy_ok', {symbol, order}),
                (error) => appEmitter.emit('exchange:buy_ok', {symbol, error})
            );

    });

    // internalExchangeEmitter.on('trade', ({trade, symbol}) => {
    //     //todo trade n'a pas toutes les prop de order, a revoir
    //     //todo envoyer sell_ok ou buy_ok en fonction du sens du trade
    //     appEmitter.emit('exchange:buy_ok', {order: trade, symbol});
    // })

    appEmitter.on('trade:put_stop_loss', async function putStopLoss({order, stopPrice}) {
        let {symbol, amount} = order;
        let orderId = symbol.toUniqHex();
        internal.createStopLossOrder({symbol, amount, orderId, stopPrice})
            .then(
                (stopLossOrder) => appEmitter.emit('exchange:stop_loss_updated', {stopLossOrder}),
                (error) => appEmitter.emit('exchange:stop_loss_updated', {error})
            )
    });
    appEmitter.on('trade:edit_stop_loss', async function putStopLoss({order, stopPrice}) {
        let {symbol, stopLossOrderId, amount} = order;
        let orderId = symbol.toUniqHex();
        internal.editStopLossOrder({symbol, stopLossOrderId, orderId, amount, stopPrice})
            .then(
                (stopLossOrder) => appEmitter.emit('exchange:stop_loss_updated', {symbol, stopLossOrder}),
                (error) => appEmitter.emit('exchange:stop_loss_updated', {symbol, error})
            )
    });


    appEmitter.on('trade:sell', ({symbol}) => {
        internal.sellMarket({symbol})
            .then((order) => appEmitter.emit('exchange:sell_ok:' + symbol, {order}))
            .catch((error) => appEmitter.emit('exchange:sell_ok:' + symbol, {error}))
    });

    exchangeEmitter.on('ticker', ({ticker}) => {
        let beautyTicker = exchange.parseTicker(ticker);
        beautyTicker.green = beautyTicker.open < beautyTicker.close;
        beautyTicker.red = !beautyTicker.green;
        appEmitter.emit('exchange:ticker', {ticker: beautyTicker});
    });
});


async function loadExchange(exchangeId) {
    try {

        const exchange = new ccxt[exchangeId]({
            apiKey: APIKEY, secret: SECRET,
            verbose: true,
            'options': {
                'adjustForTimeDifference': true,
                'verbose': true, // if needed, not mandatory
                'recvWindow': 10000000, // not really needed
            },
            // nonce: function () {
            //     let milli = this.milliseconds();
            //     return milli - milli % 50;
            // }
        });
        await exchange.loadMarkets();
        const internal = require('./exchanges/' + exchangeId)(exchange);
        debug('market loaded for ' + exchangeId);
        return {exchange, internal};
    } catch (ex) {
        log('Load Exchange Error' + ex);
        process.exit(1);
    }
}

