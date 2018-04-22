const debug = require('debug')('analyse');
const _ = require('lodash');
const Promise = require('bluebird');
const { getSignalResult } = require('../analyse/analyser');
let { settingsByIndicators: indicatorSettings } = require('./indicators');

const { fetchDepth, fetch24HTrend, fetchLongTrend } = require('../utils')();

function listenToEvents() {

    let signals24H = {};
    const symbolsDta = {};
    const depths = {};
    const TIMEFRAMES = env.TIMEFRAMES;
    const signalsTimeframes = _.reduce(TIMEFRAMES, (st, tf) => Object.assign(st, { [tf]: {} }), {});

    appEmitter.on('tv:signals_24h', ({ markets }) => {
        signals24H = markets
    });
    appEmitter.on('exchange:depth', ({ depth }) => {
        depths[depth.symbol] = depth;
        // checkSignal(symbolsDta[ticker.symbol])
    });
    // appEmitter.on('tv:signals:long', ({ markets }) => {
    //     _.forEach(markets, market => {
    //         addSymbolData({ symbol: market.symbol, prop: 'longSignal', data: market });
    //         // checkSignal(symbolsDta[market.symbol])
    //     });
    // });

    appEmitter.on('tv:signals', async ({ markets, timeframe }) => {
        signalsTimeframes[timeframe] = markets;
        timeframe == env.TIMEFRAME && await analyse(markets);
    });

    async function analyse(markets) {
        // const [markets] = _.values(signalsTimeframes);

        await Promise.each(_.keys(markets), async (symbol) => {
            await Promise.each(TIMEFRAMES, async (timeframe) => {
                let signal = signalsTimeframes[timeframe][symbol];
                if (signal) {
                    let longTimeframe = timeframe == 15 ? 60 : timeframe == 60 ? 240 : '1D';
                    let longSignal = signalsTimeframes[longTimeframe] && signalsTimeframes[longTimeframe][symbol] || signal;
                    // addSymbolData({ symbol, prop: 'signal', data: signal, timeframe });
                    // longSignal && addSymbolData({ symbol, prop: 'longSignal', data: longSignal, timeframe });
                    _.extend(signal, { timeframe, longTimeframe });
                    checkSignal({ signal, depth: depths[symbol], signal24h: signals24H[symbol], longSignal });
                    delete depths[symbol];
                    // delete symbolsDta[timeframe][symbol].depth;
                }
            });
        })
        //     .finally(gotNewSignal().then(analyse));
        //
        //symbolsDta function gotNewSignal() {
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


    function tryBuy({ symbol, timeframe, signalResult }) {
        buyTimeframes[symbol] = buyTimeframes[symbol] || {};
        buyTimeframes[symbol] [timeframe] = signalResult;
        //debugger
        return !!_.reduce(TIMEFRAMES, (allBuy, timeframe) => allBuy && buyTimeframes[symbol][timeframe], true);
    }

    function noBuy({ symbol, timeframe }) {
        buyTimeframes[symbol] && buyTimeframes[symbol][timeframe] && delete buyTimeframes[symbol][timeframe];
    }


    async function checkSignal({ signal24h, depth, signal, longSignal }) {
        let { symbol, timeframe } = signal;
        let { buy, signal: signalData, signalResult } = await getSignalResult({ signal24h, depth, signal, longSignal });
        if (buy && tryBuy({ symbol, timeframe, signalResult, })) {
            appEmitter.emit('analyse:try_trade', { market: signalData, signalData, signal24h });
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
