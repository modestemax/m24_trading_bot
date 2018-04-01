const debug = require('debug')('m24:trade');
const _ = require('lodash');
const moment = require('moment');

const {getChangePercent, updatePrice} = require('./utils');

const {STOP_LOSS_PERCENT, FEE_CUR, QUOTE_CUR, TRAILING_CHANGE_PERCENT, QUOTE_CUR_QTY, TRADE_RATIO} = env;

const getTradeRatio = function () {
    const ratios = {};
    return function ({symbol}) {
        return ratios[symbol] || TRADE_RATIO
    }
}();

const tradings = {};
let balances;

global.loadExchange().then(async (exchange) => {

        function listenToTradeBuyEvent() {
            appEmitter.on('analyse:try_trade', ({market, ticker}) => {
                let {symbol} = market;
                if (!tradings[symbol]) {
                    tradings[symbol] = true;
                    let stopLossStopPrice = updatePrice({price: ticker.last, percent: STOP_LOSS_PERCENT});
                    let ratio = getTradeRatio({symbol});
                    let quoteTradeBalance = QUOTE_CUR_QTY * ratio;
                    let quoteAvailableBalance = getFreeBalance({cur: QUOTE_CUR});
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

        function listenToEvents() {

            appEmitter.on('analyse:get-trading-symbols', () => {
                appEmitter.emit('trade:symbols', {symbols: tradings})
            });

            appEmitter.on('exchange:balance', ({balance}) => {
                balances = balance;
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
                        putStopLoss({symbol, buyPrice: order.price, lastPrice: ticker.last})
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

        function putStopLoss({symbol, buyPrice, stopLossOrderId, lastPrice}) {
            let price = _.max([buyPrice, lastPrice]);
            let stopPrice = updatePrice({price, percent: STOP_LOSS_PERCENT});
            appEmitter.emit('trade:put_stop_loss', {
                symbol,
                stopLossOrderId,
                amount: getTotalBaseCurBalance({symbol}),
                stopPrice,
                limitPrice: stopPrice
            })
        }

        function updateTrailingStopLoss({order, ticker}) {
            order.prevMaxGain = order.prevMaxGain || 0;
            let change = order.maxGain - order.prevMaxGain;
            if (change >= TRAILING_CHANGE_PERCENT) {
                let {stopLossOrder, symbol, price: buyPrice} = order;
                let stopLossOrderId = stopLossOrder && stopLossOrder.id;
                putStopLoss({symbol, buyPrice, stopLossOrderId, lastPrice: ticker.last});
            }
            order.prevMaxGain = order.maxGain;
        }

        async function restartTrade() {
            balances = await    exchange.fetchBalance();
            let prices = await getAllPrices();
            return Promise.all(_.map(balances, async ({free, used, total}, baseCur) => {
                if (total && isTradable({baseCur})) {
                    let market = getMarket({baseCur});
                    let symbol = market.symbol;
                    let price = prices[symbol];
                    if (price * total >= market.limits.cost.min) {
                        let orders = await  exchange.fetchOrders(symbol);
                        let order = tradings[symbol] = getLastBuyOrder(orders);
                        tradings[symbol] = order;
                        let {price: buyPrice} = order;
                        let stopLossOrder = getLastStopLossOrder(orders);
                        if (stopLossOrder) {
                            let change = getChangePercent(stopLossOrder.price, price);
                            if (change > 1) {
                                putStopLoss({symbol, buyPrice, stopLossOrderId: stopLossOrder.id, lastPrice: price})
                            }
                        } else {
                            putStopLoss({symbol, buyPrice, lastPrice: price})
                        }
                    }
                }
            }, []));
        }

        function getMarket({baseCur}) {
            return exchange.marketsById[getPair({baseCur})]
        }

        function getBaseCur({symbol}) {
            let market = exchange.market(symbol);
            return market.baseId;
        }

        function getTotalBaseCurBalance({symbol}) {
            return getBalance({cur: getBaseCur({symbol}), part: 'total'});
        }

        function getFreeBalance({cur}) {
            return getBalance({cur, part: 'free'});
        }

        function getBalance({cur, part}) {
            return balances[cur.toUpperCase()][part];
        }

        async function getTicker({symbol}) {
            return new Promise((resolve) => {
                appEmitter.once('exchange:ticker:' + symbol, ({ticker}) => {
                    resolve(ticker);
                });
            });
        }


        async function getAllPrices() {
            return new Promise((resolve) => {
                appEmitter.once('exchange:prices', ({prices}) => {
                    resolve(prices);
                });
                appEmitter.emit('trade:get_prices');
            });
        }


        function getLastBuyOrder(orders) {
            return _(orders).filter(orders, o => o.side === 'buy')
                .sortBy([o => new Date(o.datetime)])
                .last()
                .value()
        }

        function getLastStopLossOrder(orders) {
            return _(orders).filter(orders, o =>
                o.side === 'sell' && o.status === 'open'
                && o.type === 'stop_loss_limit')
                .sortBy([o => new Date(o.datetime)])
                .last()
                .value()
        }


        function isTradable({baseCur}) {
            return !new RegExp(QUOTE_CUR + (FEE_CUR ? '|' + FEE_CUR : ''), 'i').test(baseCur)
        }

        function getPair({baseCur}) {
            return (baseCur + QUOTE_CUR).toUpperCase();
        }

        listenToEvents();
        await  restartTrade();
        listenToTradeBuyEvent()

    }
);