const debug = require('debug')('m24:trade');
const _ = require('lodash');
const moment = require('moment');

const {getChangePercent, updatePrice} = require('./utils');

const STOP_LOSS = -1;
const TRAILING_CHANGE_PERCENT = .3;
const TRADE_RATIO = .2;

const getTradeRatio = function () {
    const ratios = {};
    return function ({symbol}) {
        return ratios[symbol] || TRADE_RATIO
    }
}();

function listenToEvents() {
    const tradings = {};
    appEmitter.on('analyse:try_trade', ({market}) => {
        let {symbol} = market;
        if (!tradings[symbol]) {
            tradings[symbol] = true;
            appEmitter.emit('trade:buy', {symbol, ratio: getTradeRatio({symbol})});
        }
    });

    appEmitter.on('exchange:buy_ok', ({error, order}) => {
        let {symbol} = order;
        if (error) {
            delete tradings[symbol];
        } else {
            tradings[symbol] = order;
        }
    });

    appEmitter.on('exchange:sell_ok', ({symbol, order}) => {
        delete tradings[symbol];
    });
    appEmitter.on('exchange:ticker', ({ticker}) => {
        let {symbol} = ticker;
        let order = tradings[symbol];
        if (_.isObject(order)) {
            trade({order, ticker})
        }
    });

    appEmitter.on('exchange:stop_loss_updated', ({stopLossOrder}) => {
        let {symbol} = stopLossOrder;
        let order = tradings[symbol];
        if (_.isObject(order)) {
            order.stopLossPrice = stopLossOrder.stopPrice;
        }
    });
}


function trade({order, ticker}) {
    putStopLoss({order});
    order.gainOrLoss = order.gainOrLoss || 0;
    order.maxGain = order.maxGain || order.gainOrLoss;
    order.tradeDuration = moment.duration(new Date().getTime() - order.transactionTime).humanize();
    order.gainOrLoss = getChangePercent(order.price, ticker.price);
    order.maxGain = _.max([order.maxGain, order.gainOrLoss]);
    updateTrailingStopLoss({order})
}

function putStopLoss({order}) {
    if (!order.hasStopLoss) {
        order.hasStopLoss = true;
        let stopPrice = updatePrice({price: order.price, percent: STOP_LOSS});
        appEmitter.emit('trade:put_stop_loss', {order, stopPrice})
    }
}

function updateTrailingStopLoss({order}) {
    order.prevMaxGain = order.prevMaxGain || 0;
    if (order.stopLossPrice) {
        let change = order.maxGain - order.prevMaxGain;
        if (change >= TRAILING_CHANGE_PERCENT) {
            appEmitter.emit('trade:put_stop_loss', {order, stopPrice: order.stopLossPrice + change})
        }
    }
    order.prevMaxGain = order.maxGain;
}


listenToEvents();