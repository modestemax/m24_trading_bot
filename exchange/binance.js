const debug = require('debug')('binance');
const _ = require('lodash');
const EventEmitter = require('events');
const exchangeEmitter = new EventEmitter();

const {getTradingPairs, getPair, getSymbol, getQuotePairs} = require('../utils');
const {isProduction, APIKEY, SECRET, TIMEFRAME} = env;

const Binance = require('binance-api-node').default
const client = Binance({apiKey: APIKEY, apiSecret: SECRET});

module.exports = function (exchange) {
    function manageDepth() {
        return manageSocket({createSocket: depth, name: 'depth'});
    }

    function manageTicker() {
        return manageSocket({createSocket: ticker, name: 'ticker'});
    }

    function manageSocket({createSocket, name}) {
        const socketStore = {};
        return ({symbol, add}) => {
            if (add && !socketStore[symbol]) {
                debug('adding socket ' + name + ' for ' + symbol);
                let clean = createSocket({symbol});
                socketStore[symbol] = {
                    clean,
                    timeout: keepAlive(clean, () => socketStore[symbol] = createSocket({symbol}))
                }
            } else if (!add && socketStore[symbol]) {
                debug('removing socket ' + name + ' for ' + symbol);
                let {clean, timeout} = socketStore[symbol];
                clearTimeout(timeout);
                clean();
                delete socketStore[symbol];
            }
        }
    }


    function ticker({symbol}) {
        let pairs = getTradingPairs(symbol ? [getPair({symbol})] : getQuotePairs());
        if (pairs.length) {
            let logTicker = _.throttle((ticker) => debug('ticker', ticker.symbol, ticker.curDayClose), 30e3);
            let clean = client.ws.ticker(pairs, ticker => {
                let rawTicker = toRawTicker(ticker);
                exchangeEmitter.emit('ticker', {ticker: rawTicker});
                logTicker(ticker);
            });
            return symbol ? clean : keepAlive(clean, () => ticker({symbol}));
        }
    }

    function depth({symbol}) {
        let pairs = getTradingPairs(symbol ? [getPair({symbol})] : getQuotePairs())
            .map(symbol => ({symbol, level: 5}));
        if (pairs.length) {
            let logDepth = _.throttle((depth) => debug('depth', depth.symbol, 'BID', depth.allBid, 'ASK', depth.allAsk), 30e3);

            let clean = client.ws.partialDepth(pairs, depth => {
                depth = flattenDepth({depth});
                exchangeEmitter.emit('depth', {depth});
                logDepth(depth);
            });
            return symbol ? clean : keepAlive(clean, () => depth({symbol}));
        }
    }


    async function getAllPrices() {
        let prices = await exchange.publicGetTickerAllPrices()
        return _.reduce(prices, (prices, {symbol: pair, price}) => {
            prices[getSymbol({pair})] = +price;
            return prices;
        }, {})
    }

    function parseExecutionReport(msg) {
        let {
            orderTime: time, priceLastTrade: price, quantity: origQty,
            lastTradeQuantity: executedQty, orderType: type, orderStatus: status
        } = msg;

        return exchange.parseOrder(_.extend({}, msg, {
            time,
            price,
            origQty,
            executedQty,
            type,
            status
        }));

    }

    function getClientOrderId({symbol}) {
        return `${symbol}_m24_t${TIMEFRAME}`
    }

    function flattenDepth({depth}) {
        let symbol = exchange.marketsById[depth.symbol].symbol;
        let allBid = _.reduce(depth.bids, (bid, {price, quantity}) => {
            return bid + price * quantity;
        }, 0);
        let allAsk = _.reduce(depth.asks, (ask, {price, quantity}) => {
            return ask + price * quantity;
        }, 0);
        let buy = allBid > allAsk;
        return _.extend({}, depth, {symbol, allBid, allAsk, buy})
    }

    async function userData() {
        const clean = await client.ws.user(msg => {
            debug(msg.eventType);
            if (msg.eventType === 'account') {
                //send balance
                let balance = _.mapValues(msg.balances, ({available, locked}, cur) => {
                    return {
                        free: +available,
                        used: +locked,
                        total: +available + locked
                    }
                });
                balance = exchange.parseBalance(balance);
                exchangeEmitter.emit('user_balance', {balance});
            } else if (msg.eventType === 'executionReport') {
                let clientOrderId = getClientOrderId(msg);
                if (msg.newClientOrderId === clientOrderId
                    || msg.originalClientOrderId === clientOrderId) {

                    let order = parseExecutionReport(msg);
                    if (/SELL/i.test(msg.side) && /STOP_LOSS_LIMIT/i.test(msg.orderType)) {
                        if (/NEW/i.test(msg.orderStatus)) {
                            //new stoploss
                            exchangeEmitter.emit('stop_loss_updated', ({symbol: msg.symbol, stopLossOrder: order}));
                        }
                        if (/FILLED/i.test(msg.orderStatus)) {
                            //new stoploss
                            exchangeEmitter.emit('end_trade', ({symbol: msg.symbol, stopLossOrder: order}));
                        }
                    }

                    if (/BUY/i.test(msg.side) && /FILLED/i.test(msg.orderStatus) && /TRADE/i.test(msg.executionType)) {
                        //new buy filled
                        exchangeEmitter.emit('buy_ok', ({symbol: order.symbol, order}));
                    }
                }
            }
        });

        keepAlive(clean, userData);
    }

    function keepAlive(clean, start) {
        return setTimeout(() => {
            clean();
            start();
            // setTimeout(  start,0);
            // }, 20e3)
        }, 24 * 59 * 60e3)
    }

    function toRawTicker(ticker) {
        return _.extend({}, ticker, {
            lastPrice: ticker.curDayClose,
            highPrice: ticker.high,
            lowPrice: ticker.low,
            bidPrice: ticker.bestBid,
            bidQty: ticker.bestBidQnt,
            askPrice: ticker.bestAsk,
            askQty: ticker.bestAskQnt,
            weightedAvgPrice: ticker.weightedAvg,
            openPrice: ticker.open,
            prevClosePrice: ticker.prevDayClose,
            quoteVolume: ticker.volumeQuote,
        })
    }


    function overrideExchange() {
        let rateLimits = [];
        const ORDERS_PER_SECOND = 10, SECOND = 1e3;

        async function orderSync() {
            let time = new Date().getTime();
            if (rateLimits.length < ORDERS_PER_SECOND) {
                rateLimits.push(time)
            } else {
                let runTime10 = _.last(rateLimits) - _.first(rateLimits);
                if (runTime10 < SECOND) {
                    await exchange.sleep(SECOND - runTime10)
                }
                rateLimits.shift();
                rateLimits.push(time);
            }
        }

        function checkPrecision({symbol, quantity, price, stopPrice}) {

            //mettre ceci dans l'exchange

            let market = exchange.marketsById[symbol];

            price = price && exchange.priceToPrecision(market.symbol, price);
            stopPrice = stopPrice && exchange.priceToPrecision(market.symbol, stopPrice);
            quantity = exchange.amountToLots(market.symbol, quantity);
            ///
            if (price * quantity > market.limits.cost.min || (!price)) {
                return {symbol, quantity, price, stopPrice}
            }
        }

        exchange.privatePostOrder = _.wrap(exchange.privatePostOrder, async (privatePostOrder, ...args) => {
            await orderSync();
            let {price, stopPrice, symbol, quantity} = args[0];
            let newValues = checkPrecision({symbol, quantity, price, stopPrice});
            if (newValues) {
                let newClientOrderId = getClientOrderId({symbol});
                ({symbol, quantity, price, stopPrice} = newValues);
                _.extend(args[0], {price, stopPrice, quantity, newClientOrderId});
                if (isProduction) {
                    return privatePostOrder.apply(exchange, args)
                } else {
                    await exchange.privatePostOrderTest.apply(exchange, args);
                    return testOrder(args[0])
                }
            } else {
                throw new Error('Check price & quantity')
            }
        });
        exchange.privateDeleteOrder = _.wrap(exchange.privateDeleteOrder, async (privateDeleteOrder, ...args) => {
            await orderSync();
            return privateDeleteOrder.apply(exchange, args)
        });
        exchange.privateGetOrder = _.wrap(exchange.privateGetOrder, async (privateGetOrder, ...args) => {
            await orderSync();
            return privateGetOrder.apply(exchange, args)
        });

        function testOrder(order) {
            _.extend(order, {
                // "symbol": symbol,
                "orderId": _.uniq(),
                "clientOrderId": order.newClientOrderId,
                "transactTime": new Date().getTime(),
                "price": order.stopPrice,
                "stopLossPrice": order.stopPrice,
                "origQty": order.quantity,
                "executedQty": order.quantity,
                "status": "FILLED",
                "timeInForce": "GTC",
                // "type": type,
                // "side": side
            })
        }
    }


    overrideExchange();
    const doDepth = manageDepth();
    const doTicker = manageTicker();
    // debug('listening to tickers')
    // tickers(exchange);
    // debug('listening to depth')
    // depth({exchange});
    debug('listening to user data')
    userData();

    return {
        exchangeEmitter,
        async editStopLossOrder({symbol, stopLossOrderId, amount, stopPrice, limitPrice}) {

            return exchange.editOrder(stopLossOrderId, symbol, 'STOP_LOSS_LIMIT', 'sell', amount, void 0, {
                stopPrice,
                price: limitPrice,
                timeInForce: 'GTC'
            })
        },

        async createStopLossOrder({symbol, amount, stopPrice, limitPrice}) {
            return await exchange.createOrder(symbol, 'STOP_LOSS_LIMIT', 'sell', amount, void 0, {
                    stopPrice,
                    price: limitPrice,
                    timeInForce: 'GTC'
                }
            )
        },
        async buyMarket({symbol, stopLossStopPrice, stopLossLimitPrice, amount}) {
            try {
                let order = await exchange.createMarketBuyOrder(symbol, amount);
                order.stopLossOrder = await this.createStopLossOrder({
                    symbol,
                    amount: order.amount,
                    stopPrice: stopLossStopPrice,
                    limitPrice: stopLossLimitPrice
                });
                return order;
            } catch (ex) {
                throw  ex
            }
        },
        depth({symbol}) {
            doDepth({symbol, add: true})
        },
        noDepth({symbol}) {
            doDepth({symbol, add: false})
        },
        ticker({symbol}) {
            doTicker({symbol, add: true})
        },
        noTicker({symbol}) {
            doTicker({symbol, add: false})
        },

        async sellMarket({symbol}) {

        },
        async cancelOrders({symbol}) {
        },
        async putStopLoss({symbol, stopPrice}) {
        }
    }
}