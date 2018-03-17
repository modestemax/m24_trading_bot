const _ = require('lodash');
const {getChangePercent, updatePrice} = require('./utils');

const exchangeId =env. EXCHANGE;
const STOP_LOSS_BUY_PERCENT = .35;
let btcAmountToTrade =env. AMOUNT_TO_TRADE;//todo

loadExchange(exchangeId).then(function (exchange) {
    const {internalExchangeEmitter} = exchange;
    let tickersEvents = {};
    appEmitter.on('trade:buy', ({symbol, ratio}) => {
        if (!tickersEvents[symbol]) {
            exchange.addTicker({symbol});
        }
        appEmitter.once(exchangeId + ':ticker', ({ticker}) => {
            exchange.stopLossBuy({
                symbol,
                amount: btcAmountToTrade * ratio,
                stopPrice: updatePrice({price: ticker.price, percent: STOP_LOSS_BUY_PERCENT})
            }).catch((error) => appEmitter.emit('exchange:buy_ok:' + symbol, {error}));
        })
    });

    internalExchangeEmitter.on('trade', ({trade, symbol}) => {
        //todo trade n'a pas toutes les prop de order, a revoir
        //todo envoyer sell_ok ou buy_ok en fonction du sens du trade
        appEmitter.emit('exchange:buy_ok', {order: trade, symbol});
    })

    appEmitter.on('trade:put_stop_loss', updateStopLoss);
    appEmitter.on('trade:update_stop_loss', updateStopLoss);


    appEmitter.on('trade:sell', ({symbol}) => {
        exchange.sellMarket({symbol})
            .then((order) => appEmitter.emit('exchange:sell_ok:' + symbol, {order}))
            .catch((error) => appEmitter.emit('exchange:sell_ok:' + symbol, {error}))
    });

    internalExchangeEmitter.on('tickers', ({tickers}) => {
        //debugger
        appEmitter.emit('exchange:tickers', {tickers});
    });

    internalExchangeEmitter.on('ticker', ({ticker}) => {
        //debugger
        appEmitter.emit('exchange:ticker', {ticker});
    });


    async function updateStopLoss({long, stopPrice}) {
        try {
            let {symbol} = long;
            await   exchange.cancelOrders({symbol});
            let stopLossOrder = await   exchange.putStopLoss({symbol, stopPrice});
            appEmitter.emit('exchange:stop_loss_updated', {stopLossOrder})
        } catch (err) {
        }
    }
});


async function  loadExchange(exchange) {
    return require('./exchanges/' + exchange);
}
