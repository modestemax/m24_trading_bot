const debug = require('debug')('analyse');
const _ = require('lodash');
const analyseSignal = require('../analyse/analyser');
let {settingsByIndicators: indicatorSettings} = require('./indicators');

let symbolsData = {};
const MAX_LENGTH = 10, MIN_BUY_WEIGHT = 70 / 100;

function getsignalResult({ticker, depth, signal, longSignal}) {
    let {symbol} = signal;
    let prevSignal = symbolsData[symbol] || signal;

    let lastSignal = symbolsData[symbol] = _.extend(prevSignal, _.omit(signal, 'indicators'));
    prevSignal.indicators = _.reduce(signal.indicators, (prevIndicators, indValue, indKey) => {
        if (!_.isArray(prevIndicators[indKey])) {
            prevIndicators[indKey] = [{value: prevIndicators[indKey], time: signal.time}];
        }
        let {value: lastValue} = _.last(prevIndicators[indKey]);
        let newValue = indValue;

        if (lastValue !== newValue) {
            prevIndicators[indKey] = prevIndicators[indKey]
                .concat({
                    value: indValue,
                    time: signal.time
                }).slice(-MAX_LENGTH);
            prevSignal.indicators[indKey + '_trendingUp'] = lastValue < newValue;
            prevSignal.indicators[indKey + '_trendingDown'] = lastValue > newValue;
        }
        return prevIndicators;
    }, prevSignal.indicators);

    let signalResult = analyseSignal({ticker, depth, signal: lastSignal, longSignal, MIN_BUY_WEIGHT});

    return {
        ticker,
        depth,
        signal: lastSignal,
        longSignal,
        buy: signalResult.buy,
        buyWeight: signalResult.signalWeight,
        signalResult
    }
}

function listenToEvents() {

    const symbolsDta = {};
    appEmitter.on('exchange:ticker', ({ticker}) => {
        addSymbolData({symbol: ticker.symbol, prop: 'ticker', data: ticker});
        // checkSignal(symbolsDta[ticker.symbol])
    });
    appEmitter.on('exchange:depth', ({depth}) => {
        addSymbolData({symbol: depth.symbol, prop: 'depth', data: depth});
        // checkSignal(symbolsDta[ticker.symbol])
    });
    appEmitter.on('tv:signals_long_timeframe', ({markets}) => {
        _.forEach(markets, market => {
            addSymbolData({symbol: market.symbol, prop: 'longSignal', data: market});
            // checkSignal(symbolsDta[market.symbol])
        });
    });
    appEmitter.on('tv:signals', ({markets}) => {
        _.forEach(markets, market => {
            addSymbolData({symbol: market.symbol, prop: 'signal', data: market});
            checkSignal(symbolsDta[market.symbol])
        });
    });

    function addSymbolData({symbol, prop, data}) {
        let tickerData = symbolsDta[symbol] = symbolsDta[symbol] || {};
        tickerData[prop] = data;
    }

    function checkSignal({ticker, depth, signal, longSignal}) {
        setImmediate(() => {
            let {symbol} = signal;
            let {buy, buyWeight, signal: market, signalResult} = getsignalResult({ticker, depth, signal, longSignal});
            if (buy) {
                log(symbol + ' is good to buy');
                setImmediate(() => appEmitter.emit('analyse:try_trade', {market, ticker}));
            } else {

                if (indicatorSettings.LONG_TREND.check && !longSignal) {
                    appEmitter.emit('analyse:fetch_long_trend');
                }
                if (indicatorSettings['24H_TREND'].check && !ticker) {
                    //ceci c'est a cause de la dependance des signaux long_trend viens avant 24h
                    if (!indicatorSettings.LONG_TREND.check || (indicatorSettings.LONG_TREND.check && signalResult.indicatorsResult.LONG_TREND)) {
                        appEmitter.emit('analyse:fetch_ticker', {symbol});
                    }
                }
                if (indicatorSettings.BID_ASK_VOLUME.check && !depth) {
                    if (!indicatorSettings['24H_TREND'].check || (indicatorSettings['24H_TREND'].check && signalResult.indicatorsResult['24H_TREND'])) {
                        appEmitter.emit('analyse:fetch_depth', {symbol});
                    }
                }

                if (buyWeight === 0) {
                    indicatorSettings['24H_TREND'].check && ticker && appEmitter.emit('analyse:no_fetch_ticker', {symbol});
                    indicatorSettings.BID_ASK_VOLUME.check && depth && appEmitter.emit('analyse:no_fetch_depth', {symbol});
                }

            }
        })

    }
}

listenToEvents();
