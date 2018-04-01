const _ = require('lodash');
const ccxt = require('ccxt');

let {APIKEY, SECRET, EXCHANGE} = env;

let balances;

module.exports = loadExchange().then(function ({exchange, internal}) {
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

        appEmitter.on('app:get_prices', async () => {
            let prices = await internal.getAllPrices();
            appEmitter.emit('exchange:prices', {prices})
        });
        appEmitter.on('app:get_balances', async () => {
            if (!balances) {
                balances = await exchange.fetchBalance();
            }
            appEmitter.emit('exchange:balances', {balances});
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


        appEmitter.on('app:fetch_depth', ({symbol}) => {
            internal.depth({symbol});
        });
        appEmitter.on('app:no_fetch_depth', ({symbol}) => {
            internal.noDepth({symbol});
        });
        appEmitter.on('app:fetch_ticker', ({symbol}) => {
            internal.ticker({symbol});
        });
        appEmitter.on('app:no_fetch_ticker', ({symbol}) => {
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
            balances = balance;
            appEmitter.emit('exchange:balances', {balances});
        });
        exchangeEmitter.on('stop_loss_updated', ({symbol, stopLossOrder}) => {
            appEmitter.emit('exchange:stop_loss_updated', {symbol, stopLossOrder});
        });
        exchangeEmitter.on('end_trade', ({symbol, stopLossOrder}) => {
            appEmitter.emit('exchange:end_trade', {symbol, stopLossOrder});
        });

        exchangeEmitter.on('buy_ok', ({symbol, trade}) => {
            appEmitter.emit('exchange:buy_ok', {symbol, trade})
        });
    }
});


async function loadExchange() {
    try {

        const exchange = new ccxt[EXCHANGE]({
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
        global.exchange = exchange;

        const internal = require(`./${EXCHANGE.toLowerCase()}`)(exchange);
        debug('market loaded for ' + EXCHANGE);
        return {exchange, internal};
    } catch (ex) {
        log('Load Exchange ' + EXCHANGE + ' Error\n' + ex, debug);
        process.exit(1);
    }
}


// module.exports.loadExchange = async () => exchangePromise;
