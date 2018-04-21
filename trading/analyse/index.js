const debug = require('debug')('analyse');
const _ = require('lodash');
const Promise = require('bluebird');
const { getSignalResult } = require('../analyse/analyser');
let { settingsByIndicators: indicatorSettings } = require('./indicators');

const { fetchDepth, fetch24HTrend, fetchLongTrend } = require('../utils')();

function listenToEvents() {

    const symbolsDta = {};
    const timeframes = env.timeframes;


    appEmitter.on('tv:signals_24h', ({ markets }) => {
        _.forEach(markets, market => {
            addSymbolData({ symbol: market.symbol, prop: 'signal24h', data: market });
        });
    });
    appEmitter.on('exchange:depth', ({ depth }) => {
        addSymbolData({ symbol: depth.symbol, prop: 'depth', data: depth });
        // checkSignal(symbolsDta[ticker.symbol])
    });
    // appEmitter.on('tv:signals:long', ({ markets }) => {
    //     _.forEach(markets, market => {
    //         addSymbolData({ symbol: market.symbol, prop: 'longSignal', data: market });
    //         // checkSignal(symbolsDta[market.symbol])
    //     });
    // });
    const signalsTimeframes = {};
    appEmitter.on('tv:signals', async ({ markets, timeframe }) => {
        signalsTimeframes[timeframe] = markets;
        timeframe == env.TIMEFRAME && await analyse();
    });

    async function analyse() {
        const [markets] = _.values(signalsTimeframes);
        await Promise.each(_.keys(markets), async (symbol) => {
            await Promise.each(env.timeframes, async (timeframe) => {
                let market = signalsTimeframes[timeframe][symbol];
                let longTimeframe = timeframe == 15 ? 60 : timeframe == 60 ? 240 : '1D';
                let longMarket = signalsTimeframes[longTimeframe] && signalsTimeframes[longTimeframe][symbol];
                addSymbolData({ symbol: market.symbol, prop: 'signal', data: market, timeframe });
                longMarket && addSymbolData({ symbol: market.symbol, prop: 'longSignal', data: longMarket, timeframe });
                checkSignal(symbolsDta[timeframe][market.symbol]);
                delete symbolsDta[timeframe][market.symbol].depth;
            });
        })
        //     .finally(gotNewSignal().then(analyse));
        //
        // function gotNewSignal() {
        //     return new Promise(resolve => {
        //         appEmitter.once('tv:signals', () => {
        //             resolve();
        //         });
        //     })
        // }
    }

    // analyse();

    async function addSymbolData({ symbol, prop, data, timeframe = env.TIMEFRAME }) {
        symbolsDta[timeframe] = symbolsDta[timeframe] || {};
        let tickerData = symbolsDta[timeframe][symbol] = symbolsDta[timeframe][symbol] || {};
        tickerData[prop] = data && Object.assign(data, { timeframe });
    }

//  const trying = {};
    const buyTimeframes = {}


    function tryBuy({ symbol, timeframe }) {
        buyTimeframes[symbol] = buyTimeframes[symbol] || {};
        buyTimeframes[symbol] [timeframe] = true;

        return !!_.reduce(timeframes, (allBuy, timeframe) => allBuy && buyTimeframes[symbol][timeframe], true);
    }

    function noBuy({ symbol, timeframe }) {
        buyTimeframes[symbol] && buyTimeframes[symbol][timeframe] && delete buyTimeframes[symbol][timeframe];
    }


    async function checkSignal({ signal24h, depth, signal, longSignal }) {
        let { symbol, timeframe } = signal;
        let { buy, signal: market, signalResult } = await getSignalResult({ signal24h, depth, signal, longSignal });
        if (buy && tryBuy({ symbol, timeframe })) {
            appEmitter.emit('analyse:try_trade', { market, signal24h });
            // if (symbol==='BNB/BTC') {
            // fetchTicker({ symbol }); //this is used for trading
            // /*ticker &&*/ appEmitter.emit('analyse:try_trade', { market, /*ticker*/ });
            // if (!ticker) {
            // if (!trying[symbol]) {
            //     trying[symbol] = true;
            //     appEmitter.once('exchange:ticker:' + symbol, ({ ticker }) => {
            //         delete  trying[symbol];
            //         appEmitter.emit('analyse:try_trade', { market, ticker });
            //     });
            // }
            // }

        } else if (!buy) {
            noBuy({ symbol, timeframe });
            if (signalResult.signalWeightPercent > 49 / 100) {
                appEmitter.emit('analyse:tracking', { symbol, signalResult });
                appEmitter.emit('analyse:tracking:' + symbol, { symbol, signalResult });
            }

            if (indicatorSettings.LONG_TREND.check && !longSignal) {
                fetchLongTrend()
            }
            if (indicatorSettings['24H_TREND'].check && !signal24h) {
                fetch24HTrend()
            }
            if (indicatorSettings.BID_ASK_VOLUME.check && !depth) {
                if (!indicatorSettings['24H_TREND'].check || signalResult.indicatorsResult['24H_TREND']) {
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
