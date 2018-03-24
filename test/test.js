const ccxt = require('ccxt');
const _ = require('lodash');

const apijson = process.env.HOME + '/.api.json';
const api = require(apijson);
const APIKEY = api.api_key;
const SECRET = api.secret;

let symbol = 'TRX/BTC';
let exchange;

loadExchange('binance').then(async ({exchange, info}) => {
    let bal, orders, ticker, stopPrice, amount, orderId, order, price, timeInForce, symbolInfo, stopLossOrderId,
        stopPrice_new;
    try {
        symbolInfo = info.symbols.find(s => /trxbtc/i.test(s.symbol));
        bal = await exchange.fetchBalance();
        orders = await  exchange.fetchOrders(symbol);
        ticker = await  exchange.fetchTicker(symbol);
        stopPrice = exchange.priceToPrecision(symbol, ticker.last - ticker.last * 12 / 100);
        stopPrice_new = exchange.priceToPrecision(symbol, ticker.last - ticker.last * 8 / 100);
        amount = exchange.amountToLots(symbol, 262);
        price = exchange.priceToPrecision(symbol, stopPrice);
        timeInForce = 'GTC';
        orderId = 'toto_tata1';
        stopLossOrderId = _.find(orders, o => o.side === 'sell' && o.status === 'open' && o.type === 'stop_loss_limit');
        stopLossOrderId = stopLossOrderId && stopLossOrderId.id;
        if (price * amount > symbolInfo.filters[2].minNotional) {
            // order = await   putStoploss();
            // order=  await editStopLoss();
            order = await cancelOrder();
        }
        debugger;
    } catch (ex) {
        console.log(ex);
        debugger;
    } finally {
        debugger
    }


    async function putStoploss() {
        let order = await exchange.createOrder(symbol, 'STOP_LOSS_LIMIT', 'sell', amount, void 0, {
            stopPrice,
            price,
            newClientOrderId: orderId,
            timeInForce
        })
        debugger;
        return order;
    }

    async function editStopLoss() {
        let order = await     exchange.editOrder(stopLossOrderId, symbol, 'STOP_LOSS_LIMIT', 'sell', amount, void 0, {
            stopPrice: stopPrice_new,
            price,
            newClientOrderId: orderId,
            timeInForce
        })
        debugger;
        return order;
    }

    async function cancelOrder() {
        let order = await        exchange.cancelOrder(stopLossOrderId, symbol)
        debugger;
        return order;
    }


})

async function loadExchange(exchangeId) {
    try {

        exchange = new ccxt[exchangeId]({
            apiKey: APIKEY, secret: SECRET,
            'enableRateLimit': true,
            verbose: true,
            'options': {
                'adjustForTimeDifference': true,
                'verbose': true, // if needed, not mandatory
                'recvWindow': 10000000, // not really needed
            },
            // nonce: function () {
            //     let milli = this.milliseconds();
            //     return milli - milli % 50;
            // }
        });
        await exchange.loadMarkets();
        overrideExchange(exchange);
        let info = await exchange.publicGetExchangeInfo();
        return {exchange, info};
    } catch (ex) {
        console.log('Load Exchange Error', ex);
        process.exit(1);
    }
}


function overrideExchange(exchange) {
    exchange.privatePostOrder = _.wrap(exchange.privatePostOrder, async (privatePostOrder, ...args) => {
        if (1) {
            return privatePostOrder.apply(exchange, args)
        } else {
            return exchange.privatePostOrderTest.apply(exchange, args);
        }
    })
}
