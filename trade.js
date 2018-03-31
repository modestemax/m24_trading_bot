const debug = require('debug')('m24:trade');
const _ = require('lodash');
const moment = require('moment');

const {getChangePercent, updatePrice} = require('./utils');

const STOP_LOSS = -1;
const TRAILING_CHANGE_PERCENT = .3;
const TRADE_RATIO = env.TRADE_RATION;
let BTCQTY = env.BTCQTY;//todo

const getTradeRatio = function () {
    const ratios = {};
    return function ({symbol}) {
        return ratios[symbol] || TRADE_RATIO
    }
}();

const tradings = {};

global.loadExchange().then(async (exchange) => {

    function listenToTradeBuyEvent() {
        appEmitter.on('analyse:try_trade', ({market, ticker}) => {
            let {symbol} = market;
            if (!tradings[symbol]) {
                tradings[symbol] = true;
                let stopLossStopPrice = updatePrice({price: ticker.last, percent: STOP_LOSS});
                let ratio = getTradeRatio({symbol});
                let btc = BTCQTY * ratio;
                let amount = btc / ticker.bid;
                appEmitter.emit('trade:buy', {
                    symbol,
                    amount,
                    stopLossStopPrice,
                    stopLossLimitPrice: stopLossStopPrice
                });

                log(`${symbol} is good to buy, price: ${ticker.last}`, debug);
            }
        });

    }

    function listenToEvents() {

        appEmitter.on('analyse:get-trading-symbols', () => {
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

        appEmitter.on('exchange:stop_loss_updated', ({symbol, error, stopLossOrder}) => {
            if (error) {
                let order = tradings[symbol];
                if (order && !order.stopLossOrder) {
                    putStopLoss({order})
                }
                //find order and put stop loss
            } else {
                let order = tradings[symbol];
                if (_.isObject(order)) {
                    order.stopLossOrder = stopLossOrder;
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
        updateTrailingStopLoss({order})
    }

    function putStopLoss({order}) {
        // if (!order.hasStopLoss) {
        //     order.hasStopLoss = true;
        let stopPrice = updatePrice({price: order.price, percent: STOP_LOSS});
        appEmitter.emit('trade:put_stop_loss', {stopLossOrder, stopPrice, limitPrice})
        // }
    }

    function updateTrailingStopLoss({order}) {
        order.prevMaxGain = order.prevMaxGain || 0;
        let change = order.maxGain - order.prevMaxGain;
        if (change >= TRAILING_CHANGE_PERCENT) {
            let {stopLossOrder} = order;
            //todo
            let stopPrice = stopLossOrder.price + change;
            appEmitter.emit('trade:edit_stop_loss', {stopLossOrder, stopPrice, limitPrice: stopPrice})
        }
        order.prevMaxGain = order.maxGain;
    }

    async function restartTrade() {
        let bal = await    exchange.fetchBalance();
        let tickers = await  exchange.fetchTickers();
        return Promise.all(_.map(bal, async ({free, used, total}, baseCur) => {
            if (total && isTradable({baseCur})) {
                let market = getBtcMarket({baseCur});
                let symbol = market.symbol;
                let ticker=tickers[symbol];
                if (ticker.last * total >= market.limits.cost.min) {
                    let orders = await  exchange.fetchOrders(symbol);
                    let order = tradings[symbol] = getLastBuyOrder(orders);
                    tradings[symbol] = order;
                    let stopLossOrder = getLastStopLossOrder(orders);
                    if (stopLossOrder) {
                        let change = getChangePercent(stopLossOrder.price, ticker.last);
                        if (change > 1) {
                            let stopPrice = updatePrice({price: ticker.last, percent: STOP_LOSS});
                            appEmitter.emit('trade:edit_stop_loss', {
                                stopLossOrder, stopPrice,
                                limitPrice: stopPrice
                            })
                        }
                    } else {
                        putStopLoss({order})
                    }
                }
            }
        }, []));

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

        function getBtcMarket({baseCur}) {
            return exchange.marketsById[getPair({baseCur})]
        }

        function isTradable({baseCur}) {
            return !/btc|usd|bnb/i.test(baseCur)
        }

        function getPair({baseCur}) {
            return (baseCur + 'BTC').toUpperCase();
        }
    }

    listenToEvents();
    await restartTrade();
    listenToTradeBuyEvent()

});