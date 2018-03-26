const debug = require('debug')('binance');
const _ = require('lodash');
const EventEmitter = require('events');
const exchangeEmitter = new EventEmitter();


let {APIKEY, SECRET} = env;

const Binance = require('binance-api-node').default
const client = Binance({apiKey: APIKEY, apiSecret: SECRET});

function tickers(exchange) {
    let symbols = getTradingSymbols(exchange);
    let logTicker = _.throttle((ticker) => debug('ticker', ticker.symbol, ticker.curDayClose), 30e3);
    let clean = client.ws.ticker(symbols, ticker => {
        let rawTicker = toRawTicker(ticker);
        exchangeEmitter.emit('ticker', {ticker: rawTicker});
        logTicker(ticker);
    });
    keepAlive(clean, () => tickers(exchange));
}

function depth(exchange) {
    let symbols = getTradingSymbols(exchange).map(symbol => ({symbol, level: 5}));
    let logDepth = _.throttle((depth) => debug('depth', depth.symbol, 'BID', depth.bidBTC, 'ASK', depth.askBTC), 30e3);

    let clean = client.ws.partialDepth(symbols, depth => {
        depth = flattenDepth(depth);
        exchangeEmitter.emit('depth', {depth});
        logDepth(depth);
    });
    keepAlive(clean, () => depth(exchange));
}

function getTradingSymbols(exchange) {
    return _.keys(exchange.marketsById)
        .filter(id => /btc$/i.test(id))
        .filter(id => !/bnbbtc$/i.test(id))
}

function flattenDepth(depth) {
    depth.bidBTC = _.reduce(depth.bids, (btc, {price, quantity}) => {
        return btc + price * quantity;
    }, 0);
    depth.askBTC = _.reduce(depth.asks, (btc, {price, quantity}) => {
        return btc + price * quantity;
    }, 0);
    depth.buy = depth.bidBTC > depth.askBTC;
    return depth
}

async function userData() {
    const clean = await client.ws.user(msg => {
        debug(msg.eventType);
        if (msg.eventType === 'account') {
            //send balance
            exchangeEmitter.emit('user_balance', msg.balances);
        } else if (msg.eventType === 'executionReport') {
            if (/SELL/i.test(msg.side) && /NEW/i.test(msg.orderStatus) && /STOP_LOSS_LIMIT/i.test(msg.orderType)) {
                //new stoploss
                exchangeEmitter.emit('stop_loss_updated', ({symbol: msg.symbol, stopLossOrder: msg}));
            }
        }

    });

    keepAlive(clean, userData);
}

function keepAlive(clean, start) {
    // return;

    setTimeout(() => {
        clean();
        start();
        // setTimeout(  start,0);
        // }, 20e3)
    }, 24 * 60 * 60e3)
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


function overrideExchange(exchange) {
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
            _.extend(args[0], {price, stopPrice, quantity, newClientOrderId: `${symbol}_m24_t${env.timeframe}`});
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

module.exports = function (exchange) {
    overrideExchange(exchange);

    debug('listening to tickers')
    tickers(exchange);
    debug('listening to depth')
    depth(exchange);
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
        async sellMarket({symbol}) {

        },
        async cancelOrders({symbol}) {
        },
        async putStopLoss({symbol, stopPrice}) {
        }
    }
}