const debug = require('debug')('binance');
const _ = require('lodash');
const EventEmitter = require('events');
const exchangeEmitter = new EventEmitter();


let {APIKEY, SECRET} = env;

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
        let pairs = symbol ? [getPair(symbol)] : getTradingPairs();
        let logTicker = _.throttle((ticker) => debug('ticker', ticker.symbol, ticker.curDayClose), 30e3);
        let clean = client.ws.ticker(pairs, ticker => {
            let rawTicker = toRawTicker(ticker);
            exchangeEmitter.emit('ticker', {ticker: rawTicker});
            logTicker(ticker);
        });
        return symbol ? clean : keepAlive(clean, () => ticker({symbol}));
    }

    function depth({symbol}) {
        let pairs = (symbol ? [getPair(symbol)] : getTradingPairs())
            .map(symbol => ({symbol, level: 5}));
        let logDepth = _.throttle((depth) => debug('depth', depth.symbol, 'BID', depth.bidBTC, 'ASK', depth.askBTC), 30e3);

        let clean = client.ws.partialDepth(pairs, depth => {
            depth = flattenDepth({depth});
            exchangeEmitter.emit('depth', {depth});
            logDepth(depth);
        });
        return symbol ? clean : keepAlive(clean, () => depth({symbol}));
    }

    function getTradingPairs() {
        return _.keys(exchange.marketsById)
            .filter(id => /btc$/i.test(id))
        // .filter(id => !/bnbbtc$/i.test(id))
    }

    function getPair(symbol) {
        return exchange.market(symbol).id
    }

    function getSymbol(msg) {
        return exchange.marketsById(pair).symbol
    }

    function parseExecutionReport(msg) {
        let {
            orderTime: time, priceLastTrade: price, quantity: origQty,
            lastTradeQuantity: executedQty, orderType: type, orderStatus: status
        } = msg;

        return exchange.parseOrder(_.extend({
            time,
            price,
            origQty,
            executedQty,
            type,
            status
        }, msg));

    }

    function getClientOrderId({symbol}) {
        return `${symbol}_m24_t${env.TIMEFRAME}`
    }

    function flattenDepth({depth}) {
        let symbol = exchange.marketsById[depth.symbol].symbol;
        let bidBTC = _.reduce(depth.bids, (btc, {price, quantity}) => {
            return btc + price * quantity;
        }, 0);
        let askBTC = _.reduce(depth.asks, (btc, {price, quantity}) => {
            return btc + price * quantity;
        }, 0);
        let buy = depth.bidBTC > depth.askBTC;
        return _.extend({}, depth, {symbol, bidBTC, askBTC, buy})
    }

    async function userData() {
        const clean = await client.ws.user(msg => {
            debug(msg.eventType);
            if (msg.eventType === 'account') {
                //send balance
                exchangeEmitter.emit('user_balance', msg.balances);
            } else if (msg.eventType === 'executionReport') {
                if (msg.newClientOrderId === getClientOrderId(msg)) {
                    let order = parseExecutionReport(msg);
                    if (/SELL/i.test(msg.side) && /NEW/i.test(msg.orderStatus) && /STOP_LOSS_LIMIT/i.test(msg.orderType)) {
                        //new stoploss
                        exchangeEmitter.emit('stop_loss_updated', ({symbol: msg.symbol, stopLossOrder: order}));
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
                ({symbol, quantity, price, stopPrice} = newValues);
                _.extend(args[0], {price, stopPrice, quantity, newClientOrderId: getClientOrderId({symbol})});
                if (env.isProduction) {
                    return privatePostOrder.apply(exchange, args)
                } else {
                    let order = await exchange.privatePostOrderTest.apply(exchange, args);
                    return _.extend(order, {
                        "symbol": args[0].symbol,
                        "orderId": _.uniq(),
                        "clientOrderId": args[0].newClientOrderId,
                        "transactTime": new Date().getTime(),
                        "price": args[0].stopPrice,
                        "stopLossPrice": args[0].stopPrice,
                        "origQty": args[0].quantity,
                        "executedQty": args[0].quantity,
                        "status": "FILLED",
                        "timeInForce": "GTC",
                        "type": args[0].type,
                        "side": args[0].side
                    })
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
        })
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

        async createStopLossOrder({symbol, amount, stopLossStopPrice, stopLossLimitPrice}) {
            return await exchange.createOrder(symbol, 'STOP_LOSS_LIMIT', 'sell', amount, void 0, {
                    stopPrice: stopLossStopPrice,
                    price: stopLossLimitPrice,
                    timeInForce: 'GTC'
                }
            )
        },
        async buyMarket({symbol, stopLossStopPrice, stopLossLimitPrice, amount}) {
            try {
                let order = await exchange.createMarketBuyOrder(symbol, amount/*,{newClientOrderId:orderId}*/)
                order.stopLossOrder = await this.createStopLossOrder({
                    symbol,
                    amount: order.amount,
                    stopLossStopPrice,
                    stopLossLimitPrice
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