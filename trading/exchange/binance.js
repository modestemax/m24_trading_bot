const debug = require('debug')('binance');
const _ = require('lodash');
const EventEmitter = require('events');
const exchangeEmitter = new EventEmitter();


const { PRODUCTION, APIKEY, SECRET } = env;

const DEPTH_LEVEL = 10;

const Binance = require('binance-api-node').default
const client = Binance({ apiKey: APIKEY, apiSecret: SECRET });

module.exports = function (exchange) {
    const { getTradablePairs, getPair, getSymbol, getQuotePairs, getClientOrderId } = require('../utils')(exchange);

    function manageDepth() {
        return manageSocket({ createSocket: depth, name: 'depth' });
    }

    function manageTicker() {
        return manageSocket({ createSocket: ticker, name: 'ticker' });
    }

    function manageSocket({ createSocket, name }) {
        const socketStore = {};
        return ({ symbol, add }) => {
            if (add && !socketStore[symbol]) {
                debug('adding socket ' + name + ' for ' + symbol);
                let clean = createSocket({ symbol });
                socketStore[symbol] = {
                    clean,
                    timeout: keepAlive(clean, () => socketStore[symbol] = createSocket({ symbol }))
                }
            } else if (!add && socketStore[symbol]) {
                debug('removing socket ' + name + ' for ' + symbol);
                let { clean, timeout } = socketStore[symbol];
                clearTimeout(timeout);
                clean();
                delete socketStore[symbol];
            }
        }
    }


    function ticker({ symbol }) {
        let pairs = getTradablePairs(symbol ? [getPair({ symbol })] : getQuotePairs());
        if (pairs.length) {
            let logTicker = _.throttle((ticker) => debug('ticker', ticker.symbol, ticker.curDayClose), 30e3);
            let clean = client.ws.ticker(pairs, ticker => {
                let rawTicker = toRawTicker(ticker);
                exchangeEmitter.emit('ticker', { ticker: rawTicker });
                logTicker(ticker);
            });
            return symbol ? clean : keepAlive(clean, () => ticker({ symbol }));
        }
    }

    function depth({ symbol }) {
        let pairs = getTradablePairs(symbol ? [getPair({ symbol })] : getQuotePairs())
            .map(symbol => ({ symbol, level: DEPTH_LEVEL }));
        if (pairs.length) {
            let logDepth = _.throttle((depth) => debug('depth', depth.symbol, 'BID', depth.allBid, 'ASK', depth.allAsk), 30e3);

            let clean = client.ws.partialDepth(pairs, depth => {
                depth = flattenDepth({ depth });
                exchangeEmitter.emit('depth', { depth });
                logDepth(depth);
            });
            return symbol ? clean : keepAlive(clean, () => depth({ symbol }));
        }
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


    function flattenDepth({ depth }) {
        let symbol = exchange.marketsById[depth.symbol].symbol;
        let allBid = _.reduce(depth.bids, (bid, { price, quantity }) => {
            return bid + price * quantity;
        }, 0);
        let allAsk = _.reduce(depth.asks, (ask, { price, quantity }) => {
            return ask + price * quantity;
        }, 0);
        let buy = allBid > allAsk;
        return _.extend({}, depth, { symbol, allBid, allAsk, buy })
    }

    async function userData() {
        const clean = await client.ws.user(msg => {
            debug(msg.eventType);
            if (msg.eventType === 'account') {
                //send balance
                let balance = _.mapValues(msg.balances, ({ available, locked }, cur) => {
                    return {
                        free: +available,
                        used: +locked,
                        total: +available + locked
                    }
                });
                balance = exchange.parseBalance(balance);
                exchangeEmitter.emit('user_balance', { balance });
            } else if (msg.eventType === 'executionReport') {
                let clientOrderId = getClientOrderId(msg);
                if (msg.newClientOrderId === clientOrderId
                    || msg.originalClientOrderId === clientOrderId) {

                    let trade = parseExecutionReport(msg);
                    if (/SELL/i.test(msg.side) && /STOP_LOSS_LIMIT/i.test(msg.orderType)) {
                        if (/NEW/i.test(msg.orderStatus)) {
                            //new stoploss
                            exchangeEmitter.emit('stop_loss_updated', ({ symbol: msg.symbol, stopLossOrder: trade }));
                        }
                        if (/FILLED/i.test(msg.orderStatus)) {
                            //new stoploss
                            exchangeEmitter.emit('end_trade', ({ symbol: msg.symbol, stopLossOrder: trade }));
                        }
                    }

                    if (/BUY/i.test(msg.side) && /FILLED/i.test(msg.orderStatus) && /TRADE/i.test(msg.executionType)) {
                        //new buy filled
                        exchangeEmitter.emit('buy_ok', ({ symbol: trade.symbol, trade }));
                    }
                    if (/SELL/i.test(msg.side) && /FILLED/i.test(msg.orderStatus) && /TRADE/i.test(msg.executionType)) {
                        //new buy filled
                        exchangeEmitter.emit('sell_ok', ({ symbol: trade.symbol, trade }));
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


    async function emitTestOrderEvent(side, parsedOrder) {

        if (/buy/i.test(side)) {
            await exchange.sleep(Math.random() * 5 * 1e3);
            exchangeEmitter.emit('buy_ok', ({ symbol: parsedOrder.symbol, trade: parsedOrder }));
        } else {
            // await exchange.sleep(Math.random() * 3601 * 1e3);
            // exchangeEmitter.emit('sell_ok', ({ symbol: parsedOrder.symbol, trade: parsedOrder }));
            // exchangeEmitter.emit('stop_loss_updated', ({
            //     symbol: parsedOrder.symbol,
            //     stopLossOrder: parsedOrder
            // }))
        }
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

        function retryTimeOut(fn) {
            try {
                return fn();
            } catch (ex) {
                if (/request timed out/i.test(ex.toString())) {
                    return retryTimeOut(fn);
                }
                throw ex;
            }
        }

        function checkPrecision({ symbol, quantity, price, stopPrice }) {

            //mettre ceci dans l'exchange

            let market = exchange.marketsById[symbol];

            price = price && exchange.priceToPrecision(market.symbol, price);
            stopPrice = stopPrice && exchange.priceToPrecision(market.symbol, stopPrice);
            quantity = exchange.amountToLots(market.symbol, quantity);
            ///
            if (price * quantity > market.limits.cost.min || (!price)) {
                return { symbol, quantity, price, stopPrice }
            }
        }

        exchange.privatePostOrder = _.wrap(exchange.privatePostOrder, async (privatePostOrder, ...args) => {
            await orderSync();
            let { price, stopPrice, symbol, quantity, side } = args[0];
            let newValues = checkPrecision({ symbol, quantity, price, stopPrice });
            if (newValues) {
                let newClientOrderId = getClientOrderId({ symbol });
                ({ symbol, quantity, price, stopPrice } = newValues);
                _.extend(args[0], { price, stopPrice, quantity, newClientOrderId });
                return retryTimeOut(postOrder);
            } else {
                throw new Error('Check price & quantity')
            }

            async function postOrder() {
                if (PRODUCTION) {
                    return privatePostOrder.apply(exchange, args)
                } else {
                    await exchange.privatePostOrderTest.apply(exchange, args);
                    let order = makeTestOrder(args[0]);
                    let pOrder = exchange.parseOrder(order);
                    emitTestOrderEvent(side, pOrder);
                    return order;
                }
            }
        });
        exchange.privateDeleteOrder = _.wrap(exchange.privateDeleteOrder, async (privateDeleteOrder, ...args) => {
            await orderSync();
            return retryTimeOut(deleteOrder);

            async function deleteOrder() {
                if (PRODUCTION) {
                    return privateDeleteOrder.apply(exchange, args)
                } else {
                    let order = makeTestOrder(args[0]);
                    return order;
                }
            }
        });
        exchange.privateGetOrder = _.wrap(exchange.privateGetOrder, async (privateGetOrder, ...args) => {
            await orderSync();
            return retryTimeOut(() => privateGetOrder.apply(exchange, args))
        });

        function makeTestOrder(order) {
            return _.extend({}, order, {
                // "symbol": symbol,
                "orderId": _.uniqueId(),
                "clientOrderId": order.newClientOrderId,
                "transactTime": new Date().getTime(),
                "price": order.price || order.stopPrice,
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
        async editStopLossOrder({ symbol, stopLossOrderId, amount, stopPrice, limitPrice }) {

            return exchange.editOrder(stopLossOrderId, symbol, 'STOP_LOSS_LIMIT', 'sell', amount, void 0, {
                stopPrice,
                price: limitPrice,
                timeInForce: 'GTC'
            })
        },
        async getAllPrices() {
            let prices = await  exchange.publicGetTickerAllPrices()
            return _.reduce(prices, (prices, { symbol: pair, price }) => {
                if (pair !== '123456') {
                    prices[getSymbol({ pair })] = +price;
                }
                return prices;
            }, {})
        },
        async createStopLossOrder({ symbol, amount, stopPrice, limitPrice }) {
            return await exchange.createOrder(symbol, 'STOP_LOSS_LIMIT', 'sell', amount, void 0, {
                    stopPrice,
                    price: limitPrice,
                    timeInForce: 'GTC'
                }
            )
        },
        async buyMarket({ symbol, stopLossStopPrice, stopLossLimitPrice, amount, essay = 2 }) {
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
                if (essay) {
                    if (/"code"\s*:\s*-2010/i.test(ex.message)) {
                        //binance {"code":-2010,"msg":"Account has insufficient balance for requested action."}
                        return this.buyMarket({
                            symbol, stopLossStopPrice, stopLossLimitPrice,
                            amount: --amount,
                            essay: --essay
                        })
                    }
                }
                emitException(ex);
                throw  ex
            }
        },
        async buyLimit({ symbol, price, amount }) {
            try {
                let order = await exchange.createLimitBuyOrder(symbol, amount, price, { "timeInForce": "FOK", });
                return order;
            } catch (ex) {
                emitException(ex);
                throw  ex
            }
        },
        depth({ symbol }) {
            doDepth({ symbol, add: true })
        },
        noDepth({ symbol }) {
            doDepth({ symbol, add: false })
        },
        ticker({ symbol }) {
            doTicker({ symbol, add: true })
        },
        noTicker({ symbol }) {
            doTicker({ symbol, add: false })
        },

        async sellMarket({ symbol }) {

        },
        async cancelOrders({ symbol }) {
        },
        async putStopLoss({ symbol, stopPrice }) {
        }
    }
}