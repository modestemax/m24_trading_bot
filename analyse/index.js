const debug = require('debug')('analyse');
const _ = require('lodash');
const {getSignalResult} = require('../analyse/analyser');
let {settingsByIndicators: indicatorSettings} = require('./indicators');


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

    async function checkSignal({ticker, depth, signal, longSignal}) {
        let {symbol} = signal;
        let {buy, buyWeight, signal: market, signalResult} = getSignalResult({ticker, depth, signal, longSignal});
        if (buy) {
        // if (symbol==='BNB/BTC') {
            appEmitter.emit('analyse:fetch_ticker', {symbol}); //this is used for trading
            ticker && appEmitter.emit('analyse:try_trade', {market, ticker});
            ticker || appEmitter.once('exchange:ticker:' + symbol, ({ticker}) => {
                appEmitter.emit('analyse:try_trade', {market, ticker});
            });

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
                indicatorSettings['24H_TREND'].check && ticker && !(await isTrading({symbol})) && appEmitter.emit('analyse:no_fetch_ticker', {symbol});
                indicatorSettings.BID_ASK_VOLUME.check && depth && appEmitter.emit('analyse:no_fetch_depth', {symbol});
            }

        }
    }
}

function isTrading({symbol}) {
    return new Promise((resolve, reject) => {
        appEmitter.once('trade:symbols', ({symbols}) => {
            resolve(symbols[symbol]);
        });
        appEmitter.emit('analyse:get-trading-symbols')
    })
}

listenToEvents();
