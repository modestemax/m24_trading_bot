const _ = require('lodash');
const ccxt = require('ccxt');

let {APIKEY, SECRET} = env;

const exchangeId = env.EXCHANGE;


let exchangePromise = loadExchange(exchangeId).then(function ({exchange, internal}) {
    let {exchangeEmitter} = internal;

    listenAppEvents();

    listenExchangeEvents();
    return exchange;

    function listenAppEvents() {

        appEmitter.on('trade:buy', ({symbol, amount, stopLossStopPrice, stopLossLimitPrice}) => {
            internal.buyMarket({symbol, amount, stopLossStopPrice, stopLossLimitPrice})
                .catch(
                    (error) => appEmitter.emit('exchange:buy_ok', {symbol, error})
                );
        });

        appEmitter.on('trade:get_prices', async () => {
            let prices = await internal.getAllPrices();
            appEmitter.emit('exchange:prices', {prices})
        });

        appEmitter.on('trade:put_stop_loss', async function ({symbol, stopLossOrderId, amount, stopPrice, limitPrice}) {
            let fn = stopLossOrderId ? internal.editStopLossOrder : internal.createStopLossOrder;
            fn({
                symbol, stopLossOrderId, amount,
                stopPrice, limitPrice
            }).catch(
                (error) => appEmitter.emit('exchange:stop_loss_updated', {symbol, error})
            )
        });

        //
        // appEmitter.on('trade:sell', ({symbol}) => {
        //     internal.sellMarket({symbol})
        //         .then((order) => appEmitter.emit('exchange:sell_ok:' + symbol, {order}))
        //         .catch((error) => appEmitter.emit('exchange:sell_ok:' + symbol, {error}))
        // });


        appEmitter.on('analyse:fetch_depth', ({symbol}) => {
            internal.depth({symbol});
        });
        appEmitter.on('analyse:no_fetch_depth', ({symbol}) => {
            internal.noDepth({symbol});
        });
        appEmitter.on('analyse:fetch_ticker', ({symbol}) => {
            internal.ticker({symbol});
        });
        appEmitter.on('analyse:no_fetch_ticker', ({symbol}) => {
            internal.noTicker({symbol});
        });
    }

    function listenExchangeEvents() {

        exchangeEmitter.on('ticker', ({ticker}) => {
            let beautyTicker = exchange.parseTicker(ticker);
            beautyTicker.green = beautyTicker.open < beautyTicker.close;
            beautyTicker.red = !beautyTicker.green;
            appEmitter.emit('exchange:ticker', {ticker: beautyTicker});
            appEmitter.emit('exchange:ticker:' + beautyTicker.symbol, {ticker: beautyTicker});
        });
        exchangeEmitter.on('depth', ({depth}) => {
            appEmitter.emit('exchange:depth', {depth});
        });

        exchangeEmitter.on('user_balance', ({balance}) => {
            appEmitter.emit('exchange:balance', {balance});
        });
        exchangeEmitter.on('stop_loss_updated', ({symbol, stopLossOrder}) => {
            appEmitter.emit('exchange:stop_loss_updated', {symbol, stopLossOrder});
        });
        exchangeEmitter.on('end_trade', ({symbol, stopLossOrder}) => {
            appEmitter.emit('exchange:end_trade', {symbol, stopLossOrder});
        });

        exchangeEmitter.on('buy_ok', ({symbol, order}) => {
            appEmitter.emit('exchange:buy_ok', {symbol, order})
        });
    }
});


async function loadExchange(exchangeId) {
    try {

        const exchange = new ccxt[exchangeId]({
            apiKey: APIKEY, secret: SECRET,
            // verbose: true,
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
        let info = await exchange.publicGetExchangeInfo();
        const internal = require(`./${exchangeId}`)(exchange, info);
        debug('market loaded for ' + exchangeId);
        return {exchange, internal};
    } catch (ex) {
        log('Load Exchange Error\n' + ex, debug);
        process.exit(1);
    }
}

global.loadExchange = module.exports.loadExchange = async () => exchangePromise;
