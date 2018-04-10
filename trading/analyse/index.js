const debug = require('debug')('analyse');
const _ = require('lodash');
const { getSignalResult } = require('../analyse/analyser');
let { settingsByIndicators: indicatorSettings } = require('./indicators');

const { isCurrentlyTrading, fetchTicker, fetchDepth, fetchLongTrend } = require('../utils')();

function listenToEvents() {

    const symbolsDta = {};
    appEmitter.on('exchange:ticker', ({ ticker }) => {
        addSymbolData({ symbol: ticker.symbol, prop: 'ticker', data: ticker });
        // checkSignal(symbolsDta[ticker.symbol])
    });
    appEmitter.on('exchange:depth', ({ depth }) => {
        addSymbolData({ symbol: depth.symbol, prop: 'depth', data: depth });
        // checkSignal(symbolsDta[ticker.symbol])
    });
    appEmitter.on('tv:signals_long_timeframe', ({ markets }) => {
        _.forEach(markets, market => {
            addSymbolData({ symbol: market.symbol, prop: 'longSignal', data: market });
            // checkSignal(symbolsDta[market.symbol])
        });
    });
    appEmitter.on('tv:signals', ({ markets }) => {
        _.forEach(markets, market => {
            addSymbolData({ symbol: market.symbol, prop: 'signal', data: market });
            checkSignal(symbolsDta[market.symbol]);
            delete symbolsDta[market.symbol].ticker;
            delete symbolsDta[market.symbol].depth;
        });
    });

    function addSymbolData({ symbol, prop, data }) {
        let tickerData = symbolsDta[symbol] = symbolsDta[symbol] || {};
        tickerData[prop] = data;
    }

    const trying = {};

    async function checkSignal({ ticker, depth, signal, longSignal }) {
        let { symbol } = signal;
        let { buy, signal: market, signalResult } = getSignalResult({ ticker, depth, signal, longSignal });
        if (buy) {
            // if (symbol==='BNB/BTC') {
            fetchTicker({ symbol }); //this is used for trading
            ticker && appEmitter.emit('analyse:try_trade', { market, ticker });
            if (!ticker) {
                if (!trying[symbol]) {
                    trying[symbol] = true;
                    appEmitter.once('exchange:ticker:' + symbol, ({ ticker }) => {
                        delete  trying[symbol];
                        appEmitter.emit('analyse:try_trade', { market, ticker });
                    });
                }
            }

        } else {
            if (signalResult.signalWeightPercent > 49 / 100) {
                appEmitter.emit('analyse:tracking', { symbol, signalResult });
            }

            if (indicatorSettings.LONG_TREND.check && !longSignal) {
                fetchLongTrend()
            }
            if (indicatorSettings['24H_TREND'].check && !ticker) {
                //ceci c'est a cause de la dependance des signaux, "long_trend" viens avant "24h"
                if (!indicatorSettings.LONG_TREND.check || (indicatorSettings.LONG_TREND.check && signalResult.indicatorsResult.LONG_TREND)) {
                    fetchTicker({ symbol })
                }
            }
            if (indicatorSettings.BID_ASK_VOLUME.check && !depth) {
                if (!indicatorSettings['24H_TREND'].check || (indicatorSettings['24H_TREND'].check && signalResult.indicatorsResult['24H_TREND'])) {
                    fetchDepth({ symbol })
                }
            }

            // if (signalResult.signalWeight === 0) {
            //     indicatorSettings['24H_TREND'].check && ticker && !(await isCurrentlyTrading({ symbol })) && appEmitter.emit('app:no_fetch_ticker', { symbol });
            //     indicatorSettings.BID_ASK_VOLUME.check && depth && appEmitter.emit('app:no_fetch_depth', { symbol });
            // }

        }
    }
}


listenToEvents();
