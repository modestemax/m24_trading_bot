const debug = require('debug')('binance');
const _ = require('lodash');
const EventEmitter = require('events');
const exchangeEmitter = new EventEmitter();


let {APIKEY, SECRET} = env;

const Binance = require('binance-api-node').default
const client = Binance({apiKey: APIKEY, apiSecret: SECRET,});

function tickers(exchange) {
    let symbols = _.keys(exchange.marketsById).filter(id => /btc$/i.test(id));
    let logTicker = _.throttle((ticker) => debug('ticker', ticker.symbol, ticker.curDayClose), 30e3);
    client.ws.ticker(symbols, ticker => {
        let rawTicker = toRawTicker(ticker);
        exchangeEmitter.emit('ticker', {ticker: rawTicker});
        logTicker(ticker);
    });
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
    let timeOuts = [];
    const ORDERS_PER_SECOND = 10, SECOND = 1e3;

    async function orderSync() {
        let time = new Date().getTime();
        if (timeOuts.length < ORDERS_PER_SECOND) {
            timeOuts.push(time)
        } else {
            let runTime10 = _.last(timeOuts) - _.first(timeOuts);
            if (runTime10 < SECOND) {
                await exchange.sleep(SECOND - runTime10)
            }
            timeOuts.shift();
            timeOuts.push(time);
        }
    }

    exchange.privatePostOrder = _.wrap(exchange.privatePostOrder, async (privatePostOrder, ...args) => {
        await orderSync();
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

    tickers(exchange);

    return {
        exchangeEmitter,
        // addTicker({symbol}) {
        //     symbolWS({symbol})
        // },


        async editStopLossOrder({symbol, stopLossOrderId, amount, stopPrice, limitPrice}) {
            amount = exchange.amountToLots(symbol, amount);
            return exchange.editOrder(stopLossOrderId, symbol, 'STOP_LOSS_LIMIT', 'sell', amount, void 0, {
                stopPrice,
                price: limitPrice,
                newClientOrderId: symbol + '_m24',
                timeInForce: 'GTC'
            })
        },

        async createStopLossOrder({symbol, amount, stopLossStopPrice, stopLossLimitPrice}) {
            return await exchange.createOrder(symbol, 'STOP_LOSS_LIMIT', 'sell', amount, void 0, {
                    stopPrice: stopLossStopPrice,
                    price: stopLossLimitPrice,
                    newClientOrderId: symbol + '_m24',
                    timeInForce: 'GTC'
                }
            )
        },
        async buyMarket({symbol, stopLossStopPrice, stopLossLimitPrice, amount}) {
            try {
                amount = exchange.amountToLots(symbol, amount);
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