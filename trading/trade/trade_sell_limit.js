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

const MIN_GAIN_TO_CONTINUE_TRADE = 0.5;
const tradings = {};
const closedTrades = [];

/**
 * cet evenement effectue un trade complet
 * achat, vente mise à jour et stop des pertes
 */
appEmitter.prependListener('analyse:try_trade', async ({ market }) => {
    doIntelligentTrade();

    function doIntelligentTrade({ simulation = true } = {}) {
        let { symbol, close: buyPrice } = market;

        //for debug
        // if (_.keys(tradings).length) return;

        let trade = tradings[symbol];

        // if (!isGoingUp({ symbol, price: market.close })) return;

        if (trade && trade.updateTrade) {
            return updateTrade();
        }
        else if (!trade) {
            //one trade at once
            trade = tradings[symbol] = {
                symbol,
                update: 0,
                maxGain: 0,
                minGain: 0,
                gainOrLoss: 0,
                target: SELL_LIMIT_PERCENT
            };

            overrideExchange({ trade });

            trade.status = startTrade().catch(emitException).finally(endTrade);
        }

        function overrideExchange({ trade }) {
            if (simulation) {
                trade.cancelOrder = _.noop;
                trade.createMarketSellOrder = _.noop;
                trade.createLimitBuyOrder = _.noop;
                trade.createLimitSellOrder = _.noop;
                getFreeBalance = () => Infinity;
            } else {
                trade.cancelOrder = exchange.cancelOrder.bind(exchange);
                trade.createMarketSellOrder = exchange.createMarketSellOrder.bind(exchange);
                trade.createLimitBuyOrder = exchange.createLimitBuyOrder.bind(exchange);
                trade.createLimitSellOrder = exchange.createLimitSellOrder.bind(exchange);
            }
        }

        function endTrade() {

            delete  tradings[symbol];
            //log trade
            trade && trade.started && closedTrades.push(trade) && emit('ended', trade);
            noFetchTicker({ symbol })
        }

        async function startTrade() {

            emit('starting', trade);

            //get trade start time
            let time = Date.now();

            //get quantity of symbol to buy for this trade
            let amount = await getTradeAmount({ symbol, price: buyPrice });

            if (amount) {
                //prepare canceling order if not buy on time
                let waitOrCancelOrder = prepareOrder({
                    symbol,
                    maxWait: MAX_WAIT_BUY_TIME,
                    cancelOrder: trade.cancelOrder
                });

                //bid
                let buyOrder = await trade.createLimitBuyOrder(symbol, amount, buyPrice, { "timeInForce": "FOK", });

                //for the bid to succeed or cancal it after some time
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
                    maxWait: MAX_WAIT_TRADE_TIME,
                    cancelOrder: trade.cancelOrder,
                    createMarketSellOrder: trade.createMarketSellOrder,
                });

                //place the sell order
                let sellOrder = await trade.createLimitSellOrder(symbol, amount, sellPrice);
                let updateTrade = getTradeUpdater({ sellOrder, sellState, trade });

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
                    buyPrices: [buyPrice],
                    sellState
                });

                emit('started', trade);
                //get the final sell price
                trade.finalSellPrice = await sellState;
                return trade;
            } else {
                emitException('Insufficient Quote balance');
                // return;
            }

            // return trade.status;
        }

        async function updateTrade() {

            let gainOrLoss = getChangePercent(_.last(trade.buyPrices), buyPrice);
            if (gainOrLoss > MIN_GAIN_TO_CONTINUE_TRADE * (trade.update + 1)) {
                if (simulation) {
                    endTrade();
                    return doIntelligentTrade({ simulation: false });
                }
                emit('updating', trade);
                //get the sell price
                let sellPrice = await updatePrice({ price: buyPrice, percent: SELL_LIMIT_PERCENT });
                //get the stop loss price
                let stopPrice = await updatePrice({ price: buyPrice, percent: await  getStopLossPercent() });
                await trade.updateTrade({ sellPrice, stopPrice });
                _.extend(trade, {
                    sellPrice,
                    stopPrice,
                    buyPrices: trade.buyPrices.concat(buyPrice),
                    target: getChangePercent(trade.buyPrice, sellPrice)
                });
                trade.update++;
                emit('updated', trade)
            }

        }
    }
});


function prepareOrder({ symbol, maxWait = 60, cancelOrder }) {
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
                            order && await   cancelOrder(order.id, symbol);

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

    let canceller = cancelOrder && cancelBuyIfTimeout();

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

function sellIfPriceIsGoingDownOrTakingTooMuchTime({
                                                       symbol, amount, stopPrice, maxWait,
                                                       cancelOrder = _.noop,
                                                       createMarketSellOrder = _.noop,
                                                   }) {
    let sellOrder, trade, startTime = Date.now();
    const tickerListener = async ({ ticker }) => {
        if (ticker.last <= stopPrice || (Date.now() - startTime) >= maxWait) {
            removeTickerListener();
            sellOrder && await  cancelOrder(sellOrder.id, symbol);
            createMarketSellOrder(symbol, amount);
        }
        trade && logChange({ trade, ticker })
    };

    addTickerListener();

    function addTickerListener() {
        appEmitter.prependListener('exchange:ticker:' + symbol, tickerListener);
    }

    function removeTickerListener() {
        appEmitter.removeListener('exchange:ticker:' + symbol, tickerListener);
    }

    async function tradeUpdater({ sellPrice, stopPrice: stop }) {
        stopPrice = stop;
        sellOrder && await exchange.cancelOrder(sellOrder.id, symbol);
        sellOrder = await exchange.createLimitSellOrder(symbol, amount, sellPrice);
    }

    return function getTradeUpdater({ sellOrder: order, sellState, trade: thisTrade }) {
        sellOrder = order;
        trade = thisTrade;
        Promise.resolve(sellState).finally(removeTickerListener);
        return tradeUpdater;
    }
}

function logChange({ trade, ticker }) {
    trade.lastPrice = ticker.last;
    trade.gainOrLoss = getChangePercent(trade.buyPrice, ticker.last);
    trade.maxGain = _.max([trade.maxGain, trade.gainOrLoss]);
    trade.minGain = _.min([trade.minGain, trade.gainOrLoss]);
    emit('changed', trade);
}

function emit(event, trade) {
    trade && appEmitter.emit(event = 'trade:' + event, trade);
    debug('emit ' + event, trade && trade.symbol)
}

function isGoingUp({ symbol, price }) {
    return true;
    // let nominés = isGoingUp.nominés = isGoingUp.nominés || {};
    // let test = nominés[symbol];
    // if (!test) {
    //     test = nominés[symbol] = { symbol, testPrice: price, change: 0 };
    // } else {
    //     test.change = getChangePercent(test.testPrice, price);
    // }
    // return test.change >= MIN_GAIN_TO_CONTINUE_TRADE
}

appEmitter.on('app:get_currently_tradings_symbols', () => {
    appEmitter.emit('trade:symbols', { symbols: tradings })
});