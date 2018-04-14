const exchange = global.exchange;

if (!exchange) emitException('Exchange is not defined, stopping'), process.nextTick(() => process.exit(1));

const debug = require('debug')('m24:trade');
const _ = require('lodash');
const moment = require('moment');

const {
    getChangePercent, updatePrice, isTradable, getMarket
    , getTotalBaseCurBalance, getFreeBalance, getTicker, getAllPrices,
    getLastBuyOrder, getLastStopLossOrder, getBalances,
    getTradeRatio, getQuoteTradableQuantity, getTrailingChangePercent,
    getStopLossPercent, getTradeAmount, getUsedBalance, fetchTicker, noFetchTicker
} = require('../utils')();

const { SELL_LIMIT_PERCENT, MAX_WAIT_TRADE_TIME, MAX_WAIT_BUY_TIME } = env;


const tradings = {};
const closedTrades = [];

/**
 * cet evenement effectue un trade complet
 * achat, vente mise à jour et stop des pertes
 */
appEmitter.on('analyse:try_trade', async ({ market }) => {
    let { symbol, close: buyPrice } = market;

    if (_.keys(tradings).length) return;

    let trade = tradings[symbol];


    (await updateTrade()) || (startTrade().catch(emitException).finally(endTrade));


    function endTrade() {

        delete  tradings[symbol];
        //log trade
        trade && trade.started && closedTrades.push(trade) && emit('ended', trade);
        noFetchTicker({ symbol })
    }

    async function startTrade() {
        if (!trade) {
            //one trade at once
            trade = tradings[symbol] = { symbol, update: 0 };

            emit('starting', trade);

            //get trade start time
            let time = Date.now();

            //get quantity of symbol to buy for this trade
            let amount = await getTradeAmount({ symbol, price: buyPrice });

            if (amount) {
                //prepare canceling order if not buy on time
                let waitOrCancelOrder = prepareOrder({ symbol, maxWait: MAX_WAIT_BUY_TIME });

                //bid
                let buyOrder = await exchange.createLimitBuyOrder(symbol, amount, buyPrice, { "timeInForce": "FOK", });

                //for for the bid to succeed or cancal it after some time
                await waitOrCancelOrder(buyOrder);
                fetchTicker({ symbol });
                //get the sell price
                let sellPrice = await updatePrice({ price: buyPrice, percent: SELL_LIMIT_PERCENT });
                //get the stop loss price
                let stopPrice = await updatePrice({ price: buyPrice, percent: await  getStopLossPercent() });

                //check the sell in user data socket
                let sellState = checkSellState({ symbol });

                // cancel sell order and sell in market price ->stop loss
                let getTradeUpdater = sellIfPriceIsGoingDownOrTakingTooMuchTime({
                    symbol,
                    amount,
                    stopPrice,
                    maxWait: MAX_WAIT_TRADE_TIME
                });

                //place the sell order
                let sellOrder = await exchange.createLimitSellOrder(symbol, amount, sellPrice);
                let updateTrade = getTradeUpdater({ sellOrder, sellState });

                _.extend(trade, {
                    started: true,
                    time,
                    amount,
                    buyOrder,
                    sellOrder,
                    updateTrade,
                    buyPrice,
                    sellPrice,
                    stopPrice,
                    buyPrices: [buyPrice]
                });

                emit('started', trade);
                //get the final sell price
                trade.finalSellPrice = await sellState;

            } else {
                emitException('Insufficient Quote balance');
            }
        }
    }

    async function updateTrade() {
        if (trade && trade.updateTrade) {
            let gainOrLoss = getChangePercent(_.last(trade.buyPrices), buyPrice);
            if (gainOrLoss > 0.5) {
                emit('updating', trade);
                //get the sell price
                let sellPrice = await updatePrice({ price: buyPrice, percent: SELL_LIMIT_PERCENT });
                //get the stop loss price
                let stopPrice = await updatePrice({ price: buyPrice, percent: await  getStopLossPercent() });
                await trade.updateTrade({ sellPrice, stopPrice });
                _.extend(trade, { sellPrice, stopPrice, buyPrices: trade.buyPrices.concat(buyPrice) });
                trade.update++;
                emit('updated', trade)
            }
        }
    }
});


function prepareOrder({ symbol, maxWait = 60 }) {
    let order, waitTimeout;

    //symbol buy listener creator
    const onBuySymbolCreator = (resolve, reject) => ({ error, symbol, trade }) => {
        if (error) {
            reject(error);
            emitException(error)
        } else {
            resolve(trade)
        }
        clearTimeout(waitTimeout);
    };

    //cancel if can't buy on time
    async function cancelBuyIfTimeout() {
        return new Promise((resolve, reject) => {
            //create buy listener
            let onBuySymbol = onBuySymbolCreator(resolve, reject);

            //listen to symbol buy event
            appEmitter.once('exchange:buy_ok:' + symbol, onBuySymbol);

            //wait for buy or cancel
            waitTimeout = setTimeout(async () => {
                try {
                    if (order) {
                        let market = await exchange.market(symbol);

                        //recup de la balance libre
                        let balance = await getFreeBalance({ cur: market.baseId });

                        if (balance < order.amount) {
                            //pas de balance libre, ya un ordre encours
                            //annuler l'ordre
                            order && await   exchange.cancelOrder(order.id, symbol);

                            reject('Order to buy ' + symbol + ' was cancelled due to delay');
                        } else {
                            resolve(order)
                        }
                    }
                } catch (e) {
                    reject(e)
                } finally {
                    appEmitter.removeListener('exchange:buy_ok:' + symbol, onBuySymbol)
                }
            }, maxWait);


        })
    }

    let canceller = cancelBuyIfTimeout();

    return async function setBuyOrder(buyOrder) {
        order = buyOrder;
        return await canceller;
    }
}

async function checkSellState({ symbol }) {
    return new Promise((resolve) => {
        appEmitter.once('exchange:sell_ok:' + symbol, async ({ trade }) => {
            resolve(trade.price);
        })
    })

}

function sellIfPriceIsGoingDownOrTakingTooMuchTime({ symbol, amount, stopPrice, maxWait }) {
    let sellOrder, startTime = Date.now();
    const tickerListener = async ({ ticker }) => {
        if (ticker.last <= stopPrice || (Date.now() - startTime) >= maxWait) {
            removeTickerListener();
            sellOrder && await  exchange.cancelOrder(sellOrder.id, symbol);
            exchange.createMarketSellOrder(symbol, amount);
        }
    };

    addTickerListener();

    function addTickerListener() {
        appEmitter.on('exchange:ticker:' + symbol, tickerListener);
    }

    function removeTickerListener() {
        appEmitter.removeListener('exchange:ticker:' + symbol, tickerListener);
    }

    async function tradeUpdater({ sellPrice, stopPrice: stop }) {
        stopPrice = stop;
        sellOrder && await exchange.cancelOrder(sellOrder.id, symbol);
        sellOrder = await exchange.createLimitSellOrder(symbol, amount, sellPrice);
    }

    return function getTradeUpdater({ sellOrder: order, sellState }) {
        sellOrder = order;
        Promise.resolve(sellState).finally(removeTickerListener);
        return tradeUpdater;
    }
}

function emit(event, args) {
    appEmitter.emit('trade:' + event, args);
}