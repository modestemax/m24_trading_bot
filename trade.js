const debug = require('debug')('m24:trade');
const _ = require('lodash');
const moment = require('moment');

const {
    getChangePercent, updatePrice, isTradable, getMarket
    , getTotalBaseCurBalance, getFreeBalance, getTicker, getAllPrices,
    getLastBuyOrder, getLastStopLossOrder, getBalances, fetchTicker
} = require('./utils');

const {STOP_LOSS_PERCENT, QUOTE_CUR, TRAILING_CHANGE_PERCENT, QUOTE_CUR_QTY, TRADE_RATIO} = env;

const getTradeRatio = function () {
    const ratios = {};
    return function ({symbol}) {
        return ratios[symbol] || TRADE_RATIO
    }
}();

const tradings = {};


const exchange = global.exchange;

async function listenToTradeBuyEvent() {
    appEmitter.on('analyse:try_trade', async ({market, ticker}) => {
        let {symbol} = market;
        if (!tradings[symbol]) {
            tradings[symbol] = true;
            let stopLossStopPrice = updatePrice({price: ticker.last, percent: STOP_LOSS_PERCENT});
            let ratio = getTradeRatio({symbol});
            let quoteTradeBalance = QUOTE_CUR_QTY * ratio;
            let quoteAvailableBalance = await getFreeBalance({cur: QUOTE_CUR});
            if (quoteAvailableBalance >= quoteTradeBalance) {
                let remainingQuoteBalance = (quoteAvailableBalance - quoteTradeBalance);
                if (remainingQuoteBalance < quoteTradeBalance) {
                    quoteTradeBalance += remainingQuoteBalance;
                }
                let amount = quoteTradeBalance / ticker.bid;
                appEmitter.emit('trade:buy', {
                    symbol,
                    amount,
                    stopLossStopPrice,
                    stopLossLimitPrice: stopLossStopPrice
                });

                log(`${symbol} is good to buy, price: ${ticker.last}`, debug);
            }
        }
    });

}

async function listenToEvents() {

    appEmitter.on('app:get_currently_tradings_symbols', () => {
        appEmitter.emit('trade:symbols', {symbols: tradings})
    });

    appEmitter.on('exchange:buy_ok', ({error, symbol, order}) => {
        if (error) {
            delete tradings[symbol];
        } else {
            tradings[symbol] = order;
        }
    });

    appEmitter.on('exchange:ticker', ({ticker}) => {
        let {symbol} = ticker;
        let order = tradings[symbol];
        if (_.isObject(order)) {
            trade({order, ticker})
        }
    });

    appEmitter.on('exchange:stop_loss_updated', async ({symbol, error, stopLossOrder}) => {
        let order = tradings[symbol];
        if (order) {
            if (error) {
                let ticker = await getTicker({symbol});
                putStopLoss({symbol, buyPrice: order.price, amount:order.quantity, lastPrice: ticker.last})
            } else {
                if (_.isObject(order)) {
                    order.stopLossOrder = stopLossOrder;
                }
            }
        }
    });


    appEmitter.on('exchange:end_trade', ({symbol, stopLossOrder}) => {
        let order = tradings[symbol];
        let effectiveGain = getChangePercent(order.price, stopLossOrder.price);
        log('End trade ' + symbol + ' GainOrLoss ' + effectiveGain);
        delete tradings[symbol];
    });

    appEmitter.on('exchange:sell_ok', ({symbol, order}) => {
        delete tradings[symbol];
    });
}


function trade({order, ticker}) {
    // putStopLoss({order});
    order.gainOrLoss = order.gainOrLoss || 0;
    order.maxGain = order.maxGain || 0;
    order.tradeDuration = moment.duration(new Date().getTime() - order.timestamp).humanize();
    order.gainOrLoss = getChangePercent(order.price, ticker.last);
    order.maxGain = _.max([order.maxGain, order.gainOrLoss]);
    updateTrailingStopLoss({order, ticker})
}

async function putStopLoss({symbol, buyPrice, stopLossOrderId, amount, lastPrice}) {
    let price = _.max([buyPrice, lastPrice]);
    let stopPrice = updatePrice({price, percent: STOP_LOSS_PERCENT});
    appEmitter.emit('trade:put_stop_loss', {
        symbol,
        stopLossOrderId,
        amount: amount || await getTotalBaseCurBalance({symbol}),
        stopPrice,
        limitPrice: stopPrice
    })
}

function updateTrailingStopLoss({order, ticker}) {
    order.prevMaxGain = order.prevMaxGain || 0;
    let change = order.maxGain - order.prevMaxGain;
    if (change >= TRAILING_CHANGE_PERCENT) {
        let {stopLossOrder, symbol, price: buyPrice, quantity} = order;
        let stopLossOrderId;
        if (stopLossOrder) {
            stopLossOrderId = stopLossOrder.id;
            quantity = stopLossOrder.quantity || quantity;
        }

        putStopLoss({symbol, buyPrice, stopLossOrderId, amount: quantity, lastPrice: ticker.last});
    }
    order.prevMaxGain = order.maxGain;
}

async function restartTrade() {
    let balances = await getBalances();
    let prices = await getAllPrices();
    return Promise.all(_.map(balances, async ({free, used, total}, baseCur) => {
        if (total && isTradable({baseCur})) {
            let market = getMarket({baseCur});
            if (market) {
                let symbol = market.symbol;
                let price = prices[symbol];
                if (price * total >= market.limits.cost.min) {
                    let orders = await  exchange.fetchOrders(symbol);
                    let order = tradings[symbol] = getLastBuyOrder(orders);
                    tradings[symbol] = order;
                    fetchTicker({symbol});
                    let {price: buyPrice} = order;
                    let stopLossOrder = getLastStopLossOrder(orders);
                    if (stopLossOrder) {
                        let change = getChangePercent(stopLossOrder.price, price);
                        if (change > 1) {
                            putStopLoss({
                                symbol, buyPrice, stopLossOrderId: stopLossOrder.id,
                                amount: stopLossOrder.amount || order.amount, lastPrice: price
                            })
                        }
                    } else {
                        putStopLoss({symbol, amount: order.amount, buyPrice, lastPrice: price})
                    }
                }
            }
        }
    }, []));
}


listenToEvents().then(restartTrade).then(listenToTradeBuyEvent);

