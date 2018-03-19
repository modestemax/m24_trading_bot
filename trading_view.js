const debug = require('debug')('trading_view');
const curl = require('curl');
const _ = require('lodash');
const appEmitter = require('./events');
const timeframe = env.TIMEFRAME;

const params = ({timeframe = '1D'} = {}) => ((timeframe = /1d/i.test(timeframe) ? '' : '|' + timeframe), {
    "filter": [
        {"left": "change" + timeframe, "operation": "nempty"},
        {"left": "exchange", "operation": "equal", "right": "BINANCE"},
        {"left": "name,description", "operation": "match", "right": "BTC$"}
    ],
    "symbols": {"query": {"types": []}},
    "columns": [
        "name"
        , "close" + timeframe
        , "change" + timeframe
        , "high" + timeframe
        , "low" + timeframe
        , "volume" + timeframe
        , "Recommend.All" + timeframe
        , "exchange"
        , "description"
        , "ADX" + timeframe
        , "ADX-DI" + timeframe
        , "ADX+DI" + timeframe
        , "RSI" + timeframe
        , "EMA10" + timeframe
        , "EMA20" + timeframe
    ],
    "sort": {"sortBy": "change" + timeframe, "sortOrder": "desc"},
    "options": {"lang": "en"},
    "range": [0, 150]
});

const beautify = (data) => {
    return _(data).map(({d}) => {
            return formalisesymbol({
                symbol: d[0],
                close: d[1],
                changePercent: +d[2].toFixed(2),
                high: d[3],
                low: d[4],
                volume: d[5],
                signal: signal(d[6]),
                signalStrength: strength(d[6]),
                signalString: signalString(d[6]),
                exchange: d[7].toLowerCase(),
                description: d[8],
                indicators: {
                    "adx": [d[9]],
                    "adx_minus_di": [d[10]],
                    "adx_plus_di": [d[11]],
                    "rsi": [d[12]],
                    "ema10": [d[13]],
                    "ema20": [d[14]]
                }
            });

            function formalisesymbol(market) {
                market.symbol = market.symbol.replace(/btc$/i, '/BTC');
                market.symbol = market.symbol.replace(/usdt$/i, '/USDT');
                market.symbol = market.symbol.replace(/bnb$/i, '/BNB');
                market.symbol = market.symbol.replace(/eth$/i, '/ETH');
                return market;
            }

            function signal(int) {
                switch (true) {
                    case int > 0:
                        return 'buy';
                    case int < 0:
                        return 'sell';
                    default:
                        return 'neutral'
                }
            }

            function strength(int) {
                switch (true) {
                    case int > .5:
                        return 1;
                    case int < -.5:
                        return 1;
                    default:
                        return 0
                }
            }

            function signalString(int) {

                return (strength(int) === 1 ? 'Strong ' : '') + signal(int)
            }
        }
    ).groupBy('symbol').mapValues(([v]) => v).value()
}

function getSignals({data = params(), longTimeframe = false} = {}) {
    const args = arguments;
    const url = 'https://scanner.tradingview.com/crypto/scan';
    curl.postJSON(url, data, (err, res, data) => {
        try {
            if (!err) {
                let jsonData = JSON.parse(data);
                if (jsonData.data && !jsonData.error) {
                    debug('trading view ok');
                    let beautifyData = beautify(jsonData.data);
                    if (longTimeframe) {
                        return setImmediate(() => appEmitter.emit('tv:signals_long_timeframe', {markets: beautifyData}))
                    } else {
                        return setImmediate(() => appEmitter.emit('tv:signals', {markets: beautifyData}))
                    }
                }
                err = jsonData.error;
            }
            throw err;
        } catch (ex) {
            setImmediate(() => appEmitter.emit('tv:signals-error', ex));
            console.log('trading_view exception:', longTimeframe, ex)
        } finally {
            setTimeout(() => getSignals.apply(null, args), longTimeframe ? 11e3 : 2e3);
        }
    })
}


getSignals({data: params({timeframe})});

switch (timeframe) {
    case 15:
        getSignals({data: params({timeframe: 60}), longTimeframe: true});
        break;
    case 60:
        getSignals({data: params({timeframe: '1D'}), longTimeframe: true});
        break;
}


debug('trading on ' + timeframe + ' trimeframe');


// const params = (timeframe) => {
//     timeframe = !timeframe || /1d/i.test(timeframe) ? '' : '|' + timeframe;
//     return ({
//         "filter": [{"left": "change" + timeframe, "operation": "nempty"}, {
//             "left": "exchange",
//             "operation": "equal",
//             "right": "BINANCE"
//         }, {"left": "name,description", "operation": "match", "right": "rcnbtc$"}],
//         "symbols": {"query": {"types": []}},
//         "columns": ["name", "close" + timeframe, "change" + timeframe, "high" + timeframe, "low" + timeframe, "volume" + timeframe, "ADX" + timeframe, "ADX-DI" + timeframe, "ADX+DI" + timeframe, "RSI" + timeframe, "EMA10" + timeframe, "EMA20" + timeframe, "description", "name", "subtype", "pricescale", "minmov", "fractional", "minmove2", "ADX" + timeframe, "ADX+DI" + timeframe, "ADX-DI" + timeframe, "ADX+DI[1]" + timeframe, "ADX-DI[1]" + timeframe, "RSI" + timeframe, "RSI[1]" + timeframe, "EMA10" + timeframe, "close" + timeframe, "EMA20" + timeframe],
//         "sort": {"sortBy": "change" + timeframe, "sortOrder": "desc"},
//         "options": {"lang": "en"},
//         "range": [0, 150]
//     });
// }
// const beautify = (data) => {
//     return _(data).map(({d}) => {
//             return {
//                 symbol: d[0],
//                 close: d[1],
//                 changePercent: +d[2].toFixed(2),
//                 high: d[3],
//                 low: d[4],
//                 volume: d[5],
//                 // signal: signal(d[6]),
//                 // signalStrength: strength(d[6]),
//                 // exchange: d[7].toLowerCase(),
//                 description: d[12],
//                 indicators: {
//                     "adx": [d[6]],
//                     "adx_minus_di": [d[7]],
//                     "adx_plus_di": [d[8]],
//                     "rsi": [d[9]],
//                     "ema10": [d[10]],
//                     "ema20": [d[11]]
//                 }
//             };
//
//             function signal(int) {
//                 switch (true) {
//                     case int > 0:
//                         return 'buy';
//                     case int < 0:
//                         return 'sell';
//                     default:
//                         return 'neutral'
//                 }
//             }
//
//             function strength(int) {
//                 switch (true) {
//                     case int > .5:
//                         return 1;
//                     case int < -.5:
//                         return 1;
//                     default:
//                         return 0
//                 }
//             }
//         }
//     ).groupBy('symbol').mapValues(([v]) => v).value()
// }