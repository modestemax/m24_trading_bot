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

const { SELL_LIMIT_PERCENT, START_TRADE_BUY_PERCENT } = env;

const tradings = {};
const closedTrades = [];

const exchange = global.exchange;

if (!exchange) emitException('Exchange is not defined, stopping'), process.nextTick(() => process.exit(1));


/**
 * cet evenement effectue un trade complet
 * achat, vente et stop perte
 */
appEmitter.on('analyse:try_trade', async ({ market }) => {
    let { symbol, close: buyPrice } = market, order;

    async function trade() {
//get ttrade start time
        let time = Date.now();

        //get quantity of symbol to buy for this trade
        let amount = await getTradeAmount({ symbol, price: buyPrice });

        if (amount) {
            //prepare canceling order if not buy on time
            let waitOrCancelOrder = prepareOrder({ symbol, waitSecond: 60 });

            //bid
            order = await exchange.createLimitBuyOrder(symbol, amount, buyPrice, { "timeInForce": "FOK", });

            //for for the bid to succeed or cancal it after some time
            await waitOrCancelOrder(order);
            fetchTicker({ symbol });
            //get the sell price
            let sellPrice = await updatePrice({ price: buyPrice, percent: SELL_LIMIT_PERCENT });
            //get the stop loss price
            let stopPrice = await updatePrice({ price: buyPrice, percent: await  getStopLossPercent() });

            //check the sell in user data socket
            let sellState = checkSellState({ symbol });

            // cancel sell order and sell in market price ->stop loss
            let priceDown = sellIfPriceIsGoingDown({ symbol, amount, stopPrice })

            //place the sell order
            let sellOrder = await exchange.createLimitSellOrder(symbol, amount, sellPrice);
            priceDown({ sellOrder, sellState });
            debugger
            //get the final sell price
            let finalSellPrice = await sellState;

            //log trade
            addTradeClosed({ symbol, time, buy: buyPrice, sell: finalSellPrice });

        } else {
            emitException('Insufficient Quote balance');
        }
    }

    if (_.keys(tradings).length) return;
    if (!tradings[symbol]) {
        //one trade at once
        tradings[symbol] = true;

        trade().catch((e) => emitException(e)).finally(() => {
            delete  tradings[symbol];
            noFetchTicker({ symbol })
        });
    }

});


function prepareOrder({ symbol, waitSecond = 60 }) {
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
    async function wait() {
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
            }, waitSecond * 1e3);


        })
    }

    let waiter = wait();

    return async function waitOrder(buyOrder) {
        order = buyOrder;
        return await waiter;
    }
}

async function checkSellState({ symbol }) {
    return new Promise((resolve, reject) => {
        appEmitter.once('exchange:sell_ok:' + symbol, async ({ trade }) => {
            resolve(trade.price);
        })
    })

}

function sellIfPriceIsGoingDown({ symbol, amount, stopPrice }) {
    let sellOrder;
    const tickerListener = async ({ ticker }) => {
        if (ticker.last <= stopPrice) {
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

    return async function ({ sellOrder: order, sellState }) {
        sellOrder = order;
        Promise.resolve(sellState).finally(removeTickerListener);
    }
}

function addTradeClosed(trade) {
    closedTrades.push(trade);
}