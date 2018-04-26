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
    const TIMEFRAME = env.TIMEFRAME;
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

        if (!analyse.running) {
            analyse.running = true;
            try {
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
            } finally {
                analyse.running = false;
            }
        }
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

        let buySignals = buyTimeframes[symbol];
        let s5 = buySignals[5] || {};
        let s15 = buySignals[15] || {};
        let s60 = buySignals[60] || {};
        let s240 = buySignals[240] || {};
        let s, buy;
        switch (timeframe) {
            case 5:
                s = s5;
                buy = s5.strongBuy && s15.trendingUp && s60.trendingUp //&& s240.trendingUp);
                break;
            case 15:
                s = s15;
                buy = /*s5.trendingUp && */s15.strongBuy && s60.trendingUp //&& s240.trendingUp;
                break;
        }
        return buy;
        // if (buy) {
        //     s.buyTimes = s.buyTimes + 1;
        //     if (s.buyTimes >= 3) {
        //         s.buyTimes--;
        //         return true;
        //     }
        // } else {
        //     s.buyTimes = 0;
        // }
        // return !!_.reduce(TIMEFRAMES, (allBuy, timeframe) => allBuy && buyTimeframes[symbol][timeframe], true);
    }

    function accumulateSignalResult({ symbol, timeframe, signalResult }) {
        buyTimeframes[symbol] = buyTimeframes[symbol] || {};
        buyTimeframes[symbol] [timeframe] = _.extend({ buyTimes: 0 }, buyTimeframes[symbol] [timeframe], signalResult);
    }


    async function checkSignal({ signal24h, depth, signal, longSignal }) {
        let { symbol, timeframe } = signal;
        let { signal: signalData, signalResult } = await getSignalResult({ signal24h, depth, signal, longSignal });
        let { buy, strongBuy } = signalResult;
        accumulateSignalResult({ symbol, timeframe, signalResult });
        if (timeframe == env.TIMEFRAME) {
            if ((strongBuy) && tryBuy({ symbol, timeframe, signalResult, })) {
                appEmitter.emit('analyse:try_trade', { market: signalData, signalData, signal24h });
            } else if (!buy) {

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
}


listenToEvents();
