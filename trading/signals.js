const debug = require('debug')('signals');
const curl = require('curl');
const _ = require('lodash');
const appEmitter = require('./events');

let { QUOTE_CUR, EXCHANGE, TIMEFRAME } = env;


const debug2 = (tf) => _.throttle((msg) => require('debug')('signals:' + tf)(msg), 30e3);
const exchange = global.exchange;

const params = ({ timeframe, tradingCurrency = QUOTE_CUR, exchangeId = EXCHANGE } = {}) => {
    let timeframeFilter = /1d/i.test(timeframe) || timeframe == 60 * 24 ? '' : '|' + timeframe;
    return {
        timeframe,
        data: {
            "filter": [
                { "left": "change" + timeframeFilter, "operation": "nempty" },
                { "left": "exchange", "operation": "equal", "right": exchangeId.toUpperCase() },
                { "left": "name,description", "operation": "match", "right": tradingCurrency + "$" }
            ],
            "symbols": { "query": { "types": [] } },
            "columns": [
                "name"
                , "close" + timeframeFilter
                , "change" + timeframeFilter
                , "high" + timeframeFilter
                , "low" + timeframeFilter
                , "volume" + timeframeFilter
                , "Recommend.All" + timeframeFilter
                , "exchange"
                , "description"
                , "ADX" + timeframeFilter
                , "ADX-DI" + timeframeFilter
                , "ADX+DI" + timeframeFilter
                , "RSI" + timeframeFilter
                , "EMA10" + timeframeFilter
                , "EMA20" + timeframeFilter
                , "MACD.macd" + timeframeFilter
                , "MACD.signal" + timeframeFilter
                , "Aroon.Up" + timeframeFilter
                , "Aroon.Down" + timeframeFilter
                , "VWMA" + timeframeFilter
                , "open" + timeframeFilter
                , "change_from_open" + timeframeFilter
            ],
            "sort": { "sortBy": "change" + timeframeFilter, "sortOrder": "desc" },
            "options": { "lang": "en" },
            "range": [0, 150]
        }
    }

};

const beautify = (data, timeframe) => {
    return _(data).map(({ d }) => {
            let candleColor;
            let timeframeId = Math.trunc(Date.now() / env.timeframesIntervals[timeframe]);
            return exchange.marketsById[d[0]] && {
                symbol: exchange.marketsById[d[0]].symbol,
                time: new Date(),
                timeframeId,
                close: d[1],
                changePercent: +d[2].toFixed(2),
                high: d[3],
                low: d[4],
                volume: d[5],
                rating: d[6],
                signal: signal(d[6]),
                signalStrength: strength(d[6]),
                signalString: signalString(d[6]),
                exchange: d[7].toLowerCase(),
                description: d[8],
                indicators: {
                    // symbol: exchange.marketsById[d[0]].symbol,
                    // time:timeframeId* env.timeframesIntervals[timeframe],
                    // open: d[20],
                    // close: d[1],
                    // changePercent: +d[2].toFixed(2),
                    // high: d[3],
                    // low: d[4],
                    // volume: d[5],
                    // signal: signal(d[6]),
                    // signalStrength: strength(d[6]),
                    // signalString: signalString(d[6]),
                    change_from_open: d[21],
                    "adx": d[9],
                    "adx_minus_di": d[10],
                    "adx_plus_di": d[11],
                    "rsi": d[12],
                    "ema10": d[13],
                    "ema20": d[14],
                    "macd": d[15],
                    "macd_signal": d[16],
                    "aroon_up": d[17],
                    "aroon_down": d[18],
                    "vwma": d[19],
                },
                open: d[20],
                candleColor: candleColor = d[21],
                green: candleColor > 0
            };

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
    ).filter(d => d).groupBy('symbol').mapValues(([v]) => v).value()
}

function getSignals({ options = params(), /* longTimeframe,*/ rate = 1e3 } = {}) {

    const args = arguments;
    const { data, timeframe } = options;

    let debug = getSignals.debug = getSignals.debug || {};
    debug = debug[timeframe] = debug[timeframe] || debug2(timeframe);

    const url = 'https://scanner.tradingview.com/crypto/scan';

    curl.postJSON(url, data, (err, res, data) => {
        try {
            if (!err) {
                let jsonData = JSON.parse(data);
                if (jsonData.data && !jsonData.error) {
                    let beautifyData = beautify(jsonData.data, timeframe);
                    // let long = longTimeframe ? ':long' : '';
                    debug(`signals ${timeframe} ${_.keys(beautifyData).length} symbols loaded`);
                    // setImmediate(() => appEmitter.emit('tv:signals' + long, { markets: beautifyData, timeframe }))

                    // beautifyData=_.pick(beautifyData,['AMB/BTC'])

                    return setImmediate(() => appEmitter.emit('tv:signals', { markets: beautifyData, timeframe }))
                }
                err = jsonData.error;
            }
            err && emitException(err)
        } catch (ex) {
            setImmediate(() => appEmitter.emit('tv:signals-error', ex));
            log('signals exception:' + timeframe + ' ' + ex);
            emitException(ex)
        } finally {
            // setTimeout(() => getSignals.apply(null, args), rate);
        }
    })
}


async function fetchTickers() {
    try {
        let tickers = await exchange.fetchTickers();
        tickers = _.filter(tickers, t => /\/BTC$/i.test(t.symbol));
        debug2(`signals 24H_TREND ${_.keys(tickers).length} symbols loaded`);
        let pumpings = _.filter(tickers, t => t.percentage > 0);
        let meanPercentage = _.sumBy(pumpings, 'percentage') / pumpings.length;
        tickers = _.map(tickers, t => _.extend(t, { meanPercentage, pumpingCount: pumpings.length }));
        return setImmediate(() => appEmitter.emit('tv:signals_24h', { markets: tickers }))
    } catch (ex) {
        emitException(ex)
    } finally {
        setTimeout(fetchTickers, 60e3 * 10);
    }
}

function getOthersSignals({ indicator, rate }) {

    appEmitter.once('app:fetch_24h_trend', function () {
        // getSignals({ data: params(), signal24h: true, indicator: '24H_TREND', rate: 60e3 * 5 });
        fetchTickers();
    });

    // appEmitter.once('app:fetch_long_trend', function () {
    //     switch (Number(TIMEFRAME)) {
    //         case 15:
    //             getSignals({ options: params({ timeframe: 60 }), longTimeframe: true, indicator, rate });
    //             break;
    //         case 60:
    //             getSignals({ options: params({ timeframe: 240 }), longTimeframe: true, indicator, rate });
    //             break;
    //     }
    // });
}

env.TIMEFRAMES.forEach((timeframe) => setInterval(_.throttle(() => getSignals({ options: params({ timeframe }) }), 1e3), getRate(timeframe)));


debug('trading on ' + TIMEFRAME + ' trimeframe');


function getRate(timeframe) {
    if (timeframe == env.TIMEFRAME) {
        return 1e3;
    } else {
        return 5e3
    }
}