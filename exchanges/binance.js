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
    exchange.privatePostOrder = _.wrap(exchange.privatePostOrder, async (privatePostOrder, ...args) => {
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

        async createStopLossOrder({symbol, amount, orderId, stopPrice}) {
             amount = exchange.amountToLots(symbol, amount);
            return exchange.createOrder(symbol, 'STOP_LOSS', 'sell', amount, void 0, {
                stopPrice,
                newClientOrderId: orderId
            })
        },
        async editStopLossOrder({symbol, stopLossOrderId, orderId, amount, stopPrice}) {
            amount = exchange.amountToLots(symbol, amount);
            return exchange.editOrder(stopLossOrderId, symbol, 'STOP_LOSS', 'sell', amount, void 0, {
                stopPrice,
                newClientOrderId: orderId
            })
        },
        async buyMarket({symbol, lastPice, ratio, totalBTC}) {
            let btc = totalBTC * ratio;

            let amount = exchange.amountToLots(symbol, btc / lastPice);
            return exchange.createMarketBuyOrder(symbol, amount/*,{newClientOrderId:orderId}*/)
        },
        async sellMarket({symbol}) {

        },
        async cancelOrders({symbol}) {
        },
        async putStopLoss({symbol, stopPrice}) {
        }
    }
}