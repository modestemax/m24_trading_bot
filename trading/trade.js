const debug = require('debug')('m24:trade');
const _ = require('lodash');
const moment = require('moment');

const {
    getChangePercent, updatePrice, isTradable, getMarket
    , getTotalBaseCurBalance, getFreeBalance, getTicker, getAllPrices,
    getLastBuyOrder, getLastStopLossOrder, getBalances, fetchTicker,
    getTradeRatio, getQuoteTradableQuantity, getTrailingChangePercent,
    getStopLossPercent
} = require('./utils')();

const { QUOTE_CUR, START_TRADE_BUY_PERCENT } = env;

const tradings = {};

const exchange = global.exchange;

async function listenToTradeBuyEvent() {
    appEmitter.on('analyse:try_trade', async ({ market }) => {
        let { symbol } = market;
        if (!tradings[symbol]) {
            tradings[symbol] = true;

            let ratio = await getTradeRatio({ symbol });
            let quoteTradableQuantity = await getQuoteTradableQuantity();
            let quoteTradeBalance = quoteTradableQuantity * ratio;//todo QUOTE_CUR_QTY
            let quoteAvailableBalance = await getFreeBalance({ cur: QUOTE_CUR });
            if (quoteAvailableBalance >= quoteTradeBalance) {
                let remainingQuoteBalance = (quoteAvailableBalance - quoteTradeBalance);
                if (remainingQuoteBalance < quoteTradeBalance) {
                    quoteTradeBalance += remainingQuoteBalance;
                }
                let buyPrice = updatePrice({ price: market.close, percent: START_TRADE_BUY_PERCENT });

                let amount = quoteTradeBalance / buyPrice;

                appEmitter.emit('trade:buy', { symbol, amount, price: buyPrice });

                log(`${symbol} is good to buy, price: ${buyPrice}`, debug);
            }
        }
    });

}

async function listenToEvents() {

    appEmitter.on('app:get_currently_tradings_symbols', () => {
        appEmitter.emit('trade:symbols', { symbols: tradings })
    });

    appEmitter.on('exchange:buy_ok', ({ error, symbol, trade }) => {
        if (error) {
            endTrade({ symbol });
            emitException(error)
        } else {
            startTrade({ trade })
        }
    });

    appEmitter.on('exchange:ticker', ({ ticker }) => {
        let { symbol } = ticker;
        let trade = tradings[symbol];
        if (_.isObject(trade)) {
            doTrade({ trade, ticker })
        }
    });

    appEmitter.on('exchange:stop_loss_updated', async ({ symbol, error, stopLossOrder }) => {
        let order = tradings[symbol];
        if (order && order.symbol) {
            if (error) {
                emitException("Trade " + symbol + " dont have a stoploss");
                //let ticker = await getTicker({ symbol });
                //  putStopLoss({ symbol, buyPrice: order.price, amount: order.quantity, lastPrice: ticker.last })
            } else {
                order.stopLossOrder = stopLossOrder;
                order.stopLossOrderId = stopLossOrder.id;
                order.buyQuantity = stopLossOrder.quantity;
                order.stopPrice = stopLossOrder.price;
                order.stopPercent = getChangePercent(order.price, stopLossOrder.price);
            }
        }
    });


    appEmitter.on('exchange:end_trade', ({ symbol, stopLossOrder }) => {
        let order = tradings[symbol];
        let effectiveGain = getChangePercent(order.price, stopLossOrder.price);
        log('End trade ' + symbol + ' GainOrLoss ' + effectiveGain);
        endTrade({ symbol });

    });

    appEmitter.on('exchange:sell_ok', ({ symbol, order }) => {
        endTrade({ symbol });

    });
}


function doTrade({ trade, ticker }) {
    // putStopLoss({order});
    if (stopLossHasBeenRich({ trade, ticker })) {
        trade.gainOrLoss = trade.gainOrLoss || 0;
        trade.maxGain = trade.maxGain || 0;
        trade.minGain = trade.minGain || 0;
        trade.tradeDuration = moment.duration(new Date().getTime() - trade.timestamp).humanize();
        trade.price = trade.price || ticker.last;
        trade.gainOrLoss = getChangePercent(trade.price, ticker.last);
        trade.maxGain = _.max([trade.maxGain, trade.gainOrLoss]);
        trade.minGain = _.min([trade.minGain, trade.gainOrLoss]);
        updateTrailingStopLoss({ trade, ticker })
        appEmitter.emit('trade:do_trade')
    }
}

function stopLossHasBeenRich({ trade, ticker }) {
    if (env.PRODUCTION) {
        return false;
    } else {
        return trade.stopPrice <= ticker.last;
    }
}

async function putStopLoss({ symbol, buyPrice, stopLossOrderId, amount, lastPrice }) {
    let price = _.max([buyPrice, lastPrice]);
    let stopLossPercent = await getStopLossPercent();
    let stopPrice = updatePrice({ price, percent: stopLossPercent });
    appEmitter.emit('trade:put_stop_loss', {
        symbol,
        stopLossOrderId,
        amount: amount || await getTotalBaseCurBalance({ symbol }),
        stopPrice,
        limitPrice: stopPrice
    })
}

async function updateTrailingStopLoss({ trade, ticker }) {
    trade.prevMaxGain = trade.prevMaxGain || 0;
    let change = trade.maxGain - trade.prevMaxGain;
    let trailingChangePercent = await getTrailingChangePercent();
    let { stopLossOrderId, buyQuantity, symbol, price: buyPrice, amount } = trade;
    if (change >= trailingChangePercent) {
        putStopLoss({ symbol, buyPrice, stopLossOrderId, amount: buyQuantity || amount, lastPrice: ticker.last });
    } else if (!stopLossOrderId) {
        emitException("Trade " + symbol + " dont have a stoploss");
        // putStopLoss({ symbol, buyPrice, amount: amount, lastPrice: ticker.last });
    }
    trade.prevMaxGain = trade.maxGain;
}

async function restartTrade() {
    let balances = await getBalances();
    let prices = await getAllPrices();
    return Promise.all(_.map(balances, async ({ free, used, total }, baseCur) => {
        if (total && isTradable({ baseCur })) {
            let market = getMarket({ baseCur });
            if (market) {
                let symbol = market.symbol;
                let price = prices[symbol];
                let trade = await Model.Trade.load({ symbol });
                if (price * total >= market.limits.cost.min) {
                    if (trade) {
                        continueTrade({ trade });
                    } else {
                        let orders = await  exchange.fetchOrders(symbol);
                        let order = getLastBuyOrder(orders);
                        if (order) {
                            let trade = Object.assign(order, { quantity: order.amount });
                            continueTrade({ trade });
                            let { price: buyPrice } = trade;
                            let stopLossOrder = getLastStopLossOrder(orders);
                            if (stopLossOrder) {
                                let change = getChangePercent(stopLossOrder.price, price);
                                if (change > 1) {
                                    putStopLoss({
                                        symbol, buyPrice, stopLossOrderId: stopLossOrder.id,
                                        amount: stopLossOrder.amount || trade.quantity, lastPrice: price
                                    })
                                }
                            } else {
                                putStopLoss({ symbol, amount: trade.quantity, buyPrice, lastPrice: price })
                            }
                        }
                    }
                } else if (trade) {
                    endTrade({ trade });
                }
            }
        }
    }, []));
}

function continueTrade({ trade }) {
    startTrade({ trade });

}

function endTrade({ symbol, trade }) {
    if (symbol in tradings) {
        trade = tradings[symbol];
        delete tradings[symbol];
    }
    trade && trade.symbol && appEmitter.emit('trade:end_trade', { trade })
}

function startTrade({ trade }) {
    if (trade && trade.symbol) {
        let { symbol } = trade;
        tradings[symbol] = trade;
        fetchTicker({ symbol });
        putStopLoss({ symbol, buyPrice: trade.price, amount: trade.quantity || trade.amount })
        appEmitter.emit('trade:new_trade', { trade });
    }
}

listenToEvents().then(restartTrade).then(listenToTradeBuyEvent).catch((e) => {
    emitException(e);
    process.exit(1)
});

