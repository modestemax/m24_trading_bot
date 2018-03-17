const _ = require('lodash');
const moment = require('moment');

const STOP_LOSS = -1;
const TRAILING_CHANGE_PERCENT = .3;


function listenToEvents() {
    const tradings = {};
    appEmitter.on('analyse:try_trade', ({symbol}) => {
        if (!tradings[symbol]) {
            tradings[symbol] = true;
            appEmitter.once('exchange:buy_ok:' + symbol, ({err, order}) => {
                if (err) {
                    delete tradings[symbol];
                } else {
                    tradings[symbol] = order;
                }
            });
            appEmitter.emit('trade:buy', {symbol});
        }
    });

    appEmitter.on('exchange:ticker', ({ticker}) => {
        let {symbol} = ticker;
        let long = tradings[symbol];
        if (_.isObject(long)) {
            trade({long, ticker})
        }
    });

    appEmitter.on('exchange:stop_loss', ({stopLossOrder}) => {
        let {symbol} = stopLossOrder;
        let long = tradings[symbol];
        if (_.isObject(long)) {
            long.stopLossPrice = stopLossOrder.stopPrice;
        }
    });
}

function getChangePercent(buyPrice, sellPrice) {
    let gain = (sellPrice - buyPrice) / buyPrice * 100;
    return +(gain.toFixed(2));
}

function updatePrice({price, percent}) {
    return price * (1 + percent / 100)
}

function trade({long, ticker}) {
    putStopLoss({long});
    long.gainOrLoss = long.gainOrLoss || 0;
    long.maxGain = long.maxGain || long.gainOrLoss;
    long.tradeDuration = moment.duration(new Date().getTime() - long.transactionTime).humanize();
    long.gainOrLoss = getChangePercent(long.price, ticker.price);
    long.maxGain = _.max([long.maxGain, long.gainOrLoss]);
    updateTrailingStopLoss({long})
}

function putStopLoss({long}) {
    if (!long.hasStopLoss) {
        long.hasStopLoss = true;
        appEmitter.emit('trade:put_stop_loss', {
            long,
            stopPrice: updatePrice({price: long.price, percent: STOP_LOSS})
        })
    }
}

function updateTrailingStopLoss({long}) {
    long.prevMaxGain = long.prevMaxGain || 0;
    if (long.stopLossPrice) {
        let change = long.maxGain - long.prevMaxGain;
        if (change >= TRAILING_CHANGE_PERCENT) {
            appEmitter.emit('trade:update_stop_loss', {long, stopPrice: long.stopLossPrice + change})
        }
        long.prevMaxGain = long.maxGain;
    }
}
