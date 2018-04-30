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
    getStopLossPercent, getTradeAmount, getUsedBalance, fetchTicker, noFetchTicker, getTimeframeDuration
} = require('../utils')();

const { SELL_LIMIT_PERCENT, MAX_WAIT_TRADE_TIME, MAX_WAIT_BUY_TIME, START_TRADE_BUY_PERCENT } = env;

const MIN_GAIN_TO_CONTINUE_TRADE = 0.5;
const tradings = Model.Trade.open || {};
const closedTrades = Model.Trade.closed || {};
_.keys(tradings).forEach(symbol => fetchTicker({ symbol }));

appEmitter.on('tv:signals', async ({ markets, timeframe }) => {
    if (timeframe == env.TIMEFRAME) {
        _.forEach(_.keys(tradings), symbol => tradings[symbol].rating = markets[symbol].rating)
    }
});

/**
 * cet evenement effectue un trade complet
 * achat, vente mise à jour et stop des pertes
 */
appEmitter.prependListener('analyse:try_trade', async ({ signalData, signal24h }) => {
    return doIntelligentTrade({ simulation: process.env.SIMUL_FIRST_ENTRY || false });

    function doIntelligentTrade({ simulation = true } = {}) {
        let { symbol, close } = signalData;

        let buyPrice = updatePrice({ price: close, percent: START_TRADE_BUY_PERCENT });
        let stopPrice = buyPrice, sellPrice;

        //for debug
        // if (_.keys(tradings).length) return;

        let trade = tradings[symbol];

        // if (!isGoingUp({ symbol, price: signalData.close })) return;

        if (trade && (trade.updateTrade || trade.simulation)) {
            return updateTrade();
        }
        else if (!trade) {
            //one trade at once
            trade = tradings[symbol] = {
                id: _.uniqueId(symbol),
                misc: {
                    volume: signalData.volume,
                    rating: signalData.rating,
                },
                rating: signalData.rating,
                symbol,
                buyPrice,
                simulation,
                buyPrices: [buyPrice],
                update: process.env.SIMUL_FIRST_ENTRY ? +!simulation : 0,
                maxGain: 0,
                minGain: 0,
                gainOrLoss: 0,
                target: SELL_LIMIT_PERCENT,
                initialTarget: SELL_LIMIT_PERCENT,
            };

            trade.status = startTrade().finally(endTrade).catch(emitException);
        }


        function endTrade() {
            // trade = tradings[symbol];
            if (trade && !trade.simulation) {
                delete tradings[symbol];
                //log trade
                trade.started && (closedTrades[trade.id] = trade) && emit('ended', trade);
                noFetchTicker({ symbol })
            }
        }

        async function startTrade() {
            try {
                if (simulation) {
                    // appEmitter.on('analyse:tracking:' + symbol, (signalResult) => {
                    //     if (signalResult.signalWeightPercent <) {
                    //     }
                    // });
                    return
                }
                emit('starting', trade);

                //get trade start time
                let time = Date.now();


                //get quantity of symbol to buy for this trade
                let amount = await getTradeAmount({ symbol, price: buyPrice });

                if (amount) {
                    //get the sell price
                    sellPrice = updatePrice({ price: buyPrice, percent: SELL_LIMIT_PERCENT });
                    // if (sellPrice >= signal24h.high) {
                    //     // return
                    // }
                    //prepare canceling order if not buy on time
                    let waitOrCancelOrder = prepareOrder({ symbol, maxWait: MAX_WAIT_BUY_TIME });

                    //bid
                    // let buyOrder = await exchange.createLimitBuyOrder(symbol, amount, buyPrice, { "timeInForce": "FOK", });
                    let buyOrder = await exchange.createStopLimitBuyOrder(symbol, amount, buyPrice, stopPrice, { "timeInForce": "FOK", });

                    //for the bid to succeed or cancal it after some time
                    await waitOrCancelOrder(buyOrder);
                    fetchTicker({ symbol });

                    //get the stop loss price
                    stopPrice = await updatePrice({ price: buyPrice, percent: await  getStopLossPercent() });

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
            } catch (e) {
                //debugger
                throw e;
            }

            // return trade.status;
        }

        async function updateTrade() {

            let gainOrLoss = getChangePercent(_.last(trade.buyPrices), buyPrice);
            if (gainOrLoss > MIN_GAIN_TO_CONTINUE_TRADE * (trade.update + 1)) {
                if (trade.simulation) {
                    delete trade.simulation;
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
                    target2: getChangePercent(trade.buyPrice, sellPrice)
                });
                trade.update++;
                emit('updated', trade)
            } else {
                if (trade.simulation) {
                    if (Date.now() - trade.time >= env.TIMEFRAME * 60e3) {
                        endTrade();
                        return doIntelligentTrade({ simulation: true });
                    }
                }
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
    let sellOrder, trade, startTime = Date.now();
    const tickerListener = async ({ ticker }) => {
        stopPrice = process.env.NO_STOP_LOSS ? -Infinity : stopPrice;
        const duration = (Date.now() - startTime);
        if ((ticker.last <= stopPrice /*&& duration >= getTimeframeDuration()*/) /*|| duration >= maxWait*/) {
            removeTickerListener();
            sellOrder && await  exchange.cancelOrder(sellOrder.id, symbol);
            exchange.createMarketSellOrder(symbol, amount);
        } else {
            //todo remove this, it is for testing
            if (!env.PRODUCTION) {
                if (trade && ticker.last >= trade.sellPrice) {
                    trade.price = ticker.last;
                    // appEmitter.emit('exchange:sell_ok:' + trade.symbol, ({ trade }));
                }
            }
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
    debug('emit ' + event, trade && trade.symbol);
    Model.SymbolsData.save({ open: tradings, closed: closedTrades });
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
    appEmitter.emit('trade:symbols', { symbols: _.reject(_.cloneDeep(tradings), t => t.simulation) })
});
appEmitter.on('app:get_finished_tradings_symbols', () => {
    appEmitter.emit('trade:symbols:finish', { symbols: _.cloneDeep(closedTrades) });
});