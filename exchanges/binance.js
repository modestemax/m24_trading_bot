const debug = require('debug')('binance');
const _ = require('lodash');
const EventEmitter = require('events');
const exchangeEmitter = new EventEmitter();


let {APIKEY, SECRET} = env;

const Binance = require('binance-api-node').default
const client = Binance({apiKey: APIKEY, apiSecret: SECRET,});

function tickers(exchange) {
    let symbols = _.keys(exchange.marketsById).filter(id => /btc$/i.test(id));
    client.ws.ticker(symbols, ticker => {
        exchange;
        let rawTicker = toRawTicker(ticker);
        exchangeEmitter.emit('ticker', {ticker: rawTicker});
        // debug('ticker', ticker.symbol, rawTicker.lastPrice);
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

module.exports = function (exchange) {
    tickers(exchange);

    return {
        exchangeEmitter,
        // addTicker({symbol}) {
        //     symbolWS({symbol})
        // },

        async createStopLossOrder({symbol, amount, stopPrice}) {
            return exchange.createOrder(symbol, 'STOP_LOSS', 'sell', amount, void 0, {stopPrice})
        },
        async editStopLossOrder({symbol, orderId, amount, stopPrice}) {
            return exchange.editOrder(orderId, symbol, 'STOP_LOSS', 'sell', amount, void 0, {stopPrice})
        },
        async buyMarket({symbol, ratio, totalAmount}) {
            let amount = exchange.amountToLots(symbol, totalAmount * ratio);
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