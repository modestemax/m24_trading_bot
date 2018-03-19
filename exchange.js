const _ = require('lodash');
const ccxt = require('ccxt');

let {APIKEY, SECRET} = env;
const {getChangePercent, updatePrice} = require('./utils');

const exchangeId = env.EXCHANGE;
const STOP_LOSS_BUY_PERCENT = .35;
let totalAmount = env.AMOUNT_TO_TRADE;//todo

loadExchange(exchangeId).then(function ({exchange, internal}) {
    let {exchangeEmitter} = internal
    appEmitter.on('trade:buy', ({symbol, ratio}) => {

        internal.buyMarket({symbol,ratio, totalAmount})
            .then(
                (order) => appEmitter.emit('exchange:buy_ok', {order}),
                (error) => appEmitter.emit('exchange:buy_ok', {error})
            );

    });

    // internalExchangeEmitter.on('trade', ({trade, symbol}) => {
    //     //todo trade n'a pas toutes les prop de order, a revoir
    //     //todo envoyer sell_ok ou buy_ok en fonction du sens du trade
    //     appEmitter.emit('exchange:buy_ok', {order: trade, symbol});
    // })

    appEmitter.on('trade:put_stop_loss', async function putStopLoss({order, stopPrice}) {
        try {
            let {symbol, amount} = order;
            internal.createStopLossOrder({symbol, amount, stopPrice});
            appEmitter.emit('exchange:stop_loss_updated', {stopLossOrder})
        } catch (err) {
        }
    });


    appEmitter.on('trade:sell', ({symbol}) => {
        internal.sellMarket({symbol})
            .then((order) => appEmitter.emit('exchange:sell_ok:' + symbol, {order}))
            .catch((error) => appEmitter.emit('exchange:sell_ok:' + symbol, {error}))
    });

    // exchangeEmitter.on('tickers', ({tickers}) => {
    //     //debugger
    //     appEmitter.emit('exchange:tickers', {tickers: exchange.parseTickers(tickers)});
    // });

    exchangeEmitter.on('ticker', ({ticker}) => {
        let beautyTicker=exchange.parseTicker(ticker);
        beautyTicker.green = beautyTicker.open < beautyTicker.close;
        beautyTicker.red = !beautyTicker.green;
        appEmitter.emit('exchange:ticker', {ticker: beautyTicker});
    });


});


async function loadExchange(exchangeId) {
    try {

        const exchange = new ccxt[exchangeId]({
            apiKey: APIKEY, secret: SECRET,
            nonce: function () {
                let milli = this.milliseconds();
                return milli - milli % 50;
            }
        });
        await exchange.loadMarkets();
        const internal = require('./exchanges/' + exchangeId)(exchange);
        debug('market loaded for ' + exchangeId);
        return {exchange, internal};
    } catch (ex) {
        console.log('Load Exchange Error', ex);
        process.exit(1);
    }
}
