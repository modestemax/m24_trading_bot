const _ = require('lodash');

const apijson = process.env.HOME + '/.api.json';
const api = require(apijson);

let APIKEY = api.api_key;
let SECRET = api.secret;


const binance = require('binance');
const binanceWS = new binance.BinanceWS();
const streams = binanceWS.streams;

const binanceRest = createBinanceRest();

createWS(null, binanceRest);


function createBinanceRest() {

    return new binance.BinanceRest({
        key: APIKEY,// 'api-key', // Get this from your account on binance.com
        secret: SECRET,// 'api-secret', // Same for this
        timeout: 15000, // Optional, defaults to 15000, is the request time out in milliseconds
        recvWindow: 10000, // Optional, defaults to 5000, increase if you're getting timestamp errors
        disableBeautification: false,
        /*
         * Optional, default is false. Binance's API returns objects with lots of one letter keys.  By
         * default those keys will be replaced with more descriptive, longer ones.
         */
        handleDrift: false
        /* Optional, default is false.  If turned on, the library will attempt to handle any drift of
         * your clock on it's own.  If a request fails due to drift, it'll attempt a fix by requesting
         * binance's server time, calculating the difference with your own clock, and then reattempting
         * the request.
         */
    });
}


function createWS(ws, binanceRest) {
    let args = arguments;
    let tickers24hOk;

    ws && ws.close();
    binanceWS.onUserData(binanceRest, (res) => {
        debugger
    }, /*[interval]*/);

    ws = binanceWS.onCombinedStream(
        [
            // streams.depth('BNBBTC'),
            // streams.depthLevel('BNBBTC', 5),
            // streams.kline('BNBBTC', '5m'),
            // streams.aggTrade('BNBBTC'),
            // streams.trade('BNBBTC'),
            // streams.ticker('BNBBTC'),
            streams.allTickers()
        ],
        (streamEvent) => {
            switch (streamEvent.stream) {
                // case streams.depth('BNBBTC'):
                //     console.log('Depth Event', streamEvent.data);
                //     break;
                // case streams.depthLevel('BNBBTC', 5):
                //     console.log('Depth Level Event', streamEvent.data);
                //     break;
                // case streams.kline('BNBBTC', '5m'):
                //     console.log('Kline Event', streamEvent.data);
                //     break;
                // case streams.aggTrade('BNBBTC'):
                //     console.log('AggTrade Event', streamEvent.data);
                //     break;
                // case streams.trade('BNBBTC'):
                //     console.log('Trade Event', streamEvent.data);
                //     break;
                // case streams.ticker('BNBBTC'):
                //     console.log('BNBBTC Ticker Event', streamEvent.data);
                //     break;
                case streams.allTickers():
                    // console.log('allTickers OK ', streamEvent.data.length);
                    changeTickers(streamEvent.data);
                    // getPrice({symbol: 'ethbtc'});
                    break;
            }
        }
    );

    // ws.on('message', () => {
    //     tickers24hOk && clearTimeout(tickers24hOk);
    //     tickers24hOk = setTimeout(() => {
    //         market && market.emit && market.emit('binance_panic')
    //         createWS.apply(null,args)
    //     }, 10e3)
    // });
    ws.on('close', () => {
        createWS.apply(null, args)
    });
    ws.on('error', () => {
        createWS.apply(null, args)
    });

    // setTimeout(() => ws.close(), 10e3)

    return ws;
}


function changeTickers(tickers24h) {
    let btickers = _(tickers24h).filter((t) => /btc$/i.test(t.symbol)).groupBy('symbol').mapValues(t => _.extend(_.head(t), {exchange: 'binance'})).value();
    console.debug('binance -> allTickers BTC OK ', _.keys(btickers).length);
    appEmitter.emit('binance:tickers', btickers);
}


// async function createOrder({side, type = 'MARKET', symbol, totalAmount, ratio = 100, callback = _.noop, retry = 5}) {
//     try {
//         if (symbol) {
//             let loadExchangeInfo = infoLoader();
//             let quantity;
//             const [base, quote] = symbol.split('/');
//             const tradingPair = base + quote;
//             let minimun = (await loadExchangeInfo())[tradingPair];
//             let price = await getPrice({symbol});
//
//             if (side === 'BUY') {
//                 let amount = totalAmount * ratio / 100;
//                 quantity = amount / price;
//             } else {
//                 quantity = await balance(base);
//             }
//
//             quantity = +(quantity - quantity % minimun.stepSize).toFixed(8)
//             if (quantity) {
//                 let newOrder = 'newOrder';
//                 if (process.env.NODE_ENV !== 'production' || true) {
//                     newOrder = 'testOrder';
//                     //  totalAmount = 10;
//                 }
//                 let order = await binanceReady(() => binanceRest[newOrder]({
//                     symbol: tradingPair,
//                     side, type, quantity
//                 }), {priority: 1});
//
//                 order = await addHelperInOrder({order, symbol: tradingPair, price, quantity});
//                 setImmediate(() => callback(null, Object.assign({info: side + ' Order placed ' + symbol}, order)));
//             } else {
//                 callback(`Can't ${side} Undefined Quantity`)
//             }
//         } else {
//             callback(`Can't ${side} undefined symbol`)
//         }
//     } catch (ex) {
//         let err = ex && JSON.stringify(ex.msg)
//         console.log(ex, retry && 'Retrying ' + (1 - retry));
//         if (/LOT_SIZE/.test(ex.msg)) {
//             return setImmediate(() => callback(err));
//         }
//         if (retry)
//             setTimeout(() => createOrder({side, type, totalAmount, ratio, symbol, callback, retry: --retry}), 500);
//         else
//             setImmediate(() => callback(err));
//     } finally {
//         binanceBusy = false;
//     }
// }
