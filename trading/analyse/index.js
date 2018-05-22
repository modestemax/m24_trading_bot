const debug = require('debug')('analyse');
const _ = require('lodash');
const isSorted = require('is-sorted');
const trend = require('trend');
const Promise = require('bluebird');
let { settingsByIndicators: indicatorSettings } = require('./indicators');
// const { openTrades } = require('../trade')
// const trader = require('../trade');
// const { fetchDepth, fetch24HTrend, fetchLongTrend } = require('../utils')();
module.exports = function ({ env, appEmitter }) {
    const { TIMEFRAME, TIMEFRAMES, timeframesIntervals, STRATEGY, } = env

    const signals = _.reduce(TIMEFRAMES, (st, tf) => Object.assign(st, { [tf]: {} }), {});

    function listenToEvents() {
        appEmitter.on('tv:signals', async ({ markets, timeframe }) => {
            signals[timeframe] = markets;
            +timeframe === +TIMEFRAME && await analyse(markets);
        });

    }

    async function analyse(markets) {

        if (!analyse.running) {
            analyse.running = true;
            try {
                await Promise.each(_.keys(markets), async (symbolId) => {
                    await Promise.each(TIMEFRAMES, async (timeframe) => {
                        let signal = signals[timeframe][symbolId];
                        if (signal) {
                            _.extend(signal, { timeframe });
                            +timeframe === +TIMEFRAME && checkSignal({ signal });
                        }
                    });
                })
            } finally {
                analyse.running = false;
            }
        }
    }


// function checkTrend({ symbol }) {
//     let trendUp = checkTrend.trendUp = checkTrend.trendUp = {};
//     // if (signal && signal.timeframe == TIMEFRAME) {
//     // let { symbol, timeframe } = signal;
//     let s5 = signals[5][symbol] || {};
//     let s15 = signals[15][symbol] || {};
//     let s60 = signals[60][symbol] || {};
//     // let s240 = signals[240][symbol] || {};
//     // let sday = signals[60 * 24][symbol];
//     // let s;
//     // switch (timeframe) {
//     //     case 5: {
//     //         s = s5;
//     //         let [prevCh, lastCh] = s.indicators.change_from_open.slice(-2);
//     //         if (prevCh < 0 && lastCh < .1) return;
//     //         if (lastCh < .05) return;
//     //         let ema10 = _.last(s.indicators.ema10);
//     //         let ema20 = _.last(s.indicators.ema20);
//     //         if (((ema10 - ema20) / Math.abs(ema20) * 100) < .2) return;
//     //
//     //         if (s5.rating > .5 && s15.rating > .5 && s60.rating > 0 && s240.rating > 0 && sday.rating > 0) {
//     //             // return true;
//     //         }
//     //         break;
//     //     }
//     //     case 240: {
//     // s = s240;
//     return trendUp[symbol] = true;
//     // if (s5.rating > 0 && s15.rating > 0 && s60.rating > 0 && s240.rating > 0 && sday.rating > 0) {
//     if (s5 && s15 && s60 && s240 && sday) {
//         if (s5.changePercent >= 0 && s15.changePercent >= 0 && s60.changePercent >= 0 && s240.changePercent >= 0 && sday.changePercent >= 0) {
//             if (s5.changeFromOpen >= 0 && s15.changeFromOpen >= 0 && s60.changeFromOpen >= 0 && s240.changeFromOpen >= 0 && sday.changeFromOpen >= 0) {
//
//                 if (s5.ema10 > s5.ema20 && s15.ema10 > s15.ema20 && s60.ema10 > s60.ema20 && s240.ema10 > s240.ema20 && sday.ema10 > sday.ema20) {
//                     if (s5.macd > s5.macd_signal && s15.macd > s15.macd_signal && s60.macd > s60.macd_signal && s240.macd > s240.macd_signal && sday.macd > sday.macd_signal) {
//                         if (s5.adx_plus_di > s5.adx_minus_di && s15.adx_plus_di > s15.adx_minus_di && s60.adx_plus_di > s60.adx_minus_di && s240.adx_plus_di > s240.adx_minus_di && sday.adx_plus_di > sday.adx_minus_di) {
//                             return trendUp[symbol] = true;
//                         }
//                     }
//                 }
//             }
//         }
//     }
//     // }
//     delete trendUp[symbol];
//     //     break;
//     // }
//     // case 15:
//     //     s = s15;
//     //     break;
// // }
//
// // }
// }

//
// function accumulateSignalResult({ signal }) {
//     let { symbol, timeframe } = signal;
//     buyTimeframes[symbol] = buyTimeframes[symbol] || {};
//     buyTimeframes[symbol] [timeframe] = _.extend({ buyTimes: 0 }, buyTimeframes[symbol] [timeframe], signal);
// }

    function stopLossBuy(signal) {
        stopLossBuy.symbols = stopLossBuy.symbols || {};
        const { close, symbolId } = signal;
        // _.keys(stopLossBuy.symbols).forEach(symbol => stopLossBuy.symbols[symbol].tryAgain());
        stopLossBuy.symbols[symbolId] && stopLossBuy.symbols[symbolId].tryAgain({ close });

        async function tryTrade({ symbolId, price, close }) {
            if (!stopLossBuy.symbols[symbolId]) {
                stopLossBuy.symbols[symbolId] = {};
                return stopLossBuy.symbols[symbolId].promise = new Promise((resolve, reject) => {
                    stopLossBuy.symbols[symbolId].resolve = function () {
                        resolve();
                        emitMessage(symbolId + ' Trade Accepted')

                    };
                    stopLossBuy.symbols[symbolId].reject = function () {
                        reject();
                        emitMessage(symbolId + ' Trade Rejected')
                    };
                    stopLossBuy.symbols[symbolId].tryAgain = function ({ close }) {
                        if (close <= price) {
                            stopLossBuy.symbols[symbolId].resolve()
                        }
                    };
                    stopLossBuy.symbols[symbolId].tryAgain({ close });
                }).finally(() => delete stopLossBuy.symbols[symbolId])
            }
            return stopLossBuy.symbols[symbolId].promise;
        }

        function cancel({ symbolId }) {
            if (stopLossBuy.symbols[symbolId]) {
                stopLossBuy.symbols[symbolId].reject()
            }
        }

        _.defaults(stopLossBuy, { tryTrade, cancel })
    }

    function trailingStop({ symbolId, target, tradeMaxDuration, minLoss }) {
        let short;
        if (symbolId in openTrades) {
            let trade = openTrades[symbolId];
            if (trade.gainOrLoss > .5) {
                trade.winning = true;
            }
            if (trade.winning) {
                let loss = getChangePercentage({ high: trade.gainOrLoss, low: trade.maxGain });
                if (loss < -40 && trade.gainOrLoss > .1) {
                    short = true
                }
            }
            if (trade.gainOrLoss <= target && trade.maxGain > target) {
                short = true;
            }
            if (Date.now() - trade.time >= tradeMaxDuration) {
                short = true;
            }
            if (trade.gainOrLoss <= minLoss) {
                short = true;
            }

        }
        return short;
    }

    function tick(signal) {
        const TICK_COUNT = 30;
        const { close: last, symbolId } = signal
        tick.symbols = tick.symbols || {}
        const points = tick.symbols[symbolId] = tick.symbols[symbolId] || { ticks: [newTick()] };
        {
            let tick = _.last(points.ticks)
            if (tick.close !== last) {
                if (tick.count < TICK_COUNT) {
                    tick.count++;
                    let { high, close, low } = tick;
                    close = last;
                    high = _.max([high, last]);
                    low = _.min([low, last]);
                    _.extend(tick, { high, close, low });

                } else {
                    points.ticks.push(newTick())
                }
            }
        }

        function newTick() {
            return { open: last, high: last, close: last, low: last, count: 1, startTime: Date.now() }
        }

        global.symbolsTicks = tick;
    }

    async function checkSignal({ signal }) {
        const { symbolId } = signal;
        const timeframes = TIMEFRAMES;
        stopLossBuy(signal);
        tick(signal)
        let long;
        let short, skipShort;
        let bid;

        // viewTrend({ signal })

        backupLastPoints({ symbolId, timeframes });
        buildStrategy({ symbolId, timeframes });
        const m5Data = buildStrategy.getSpecialData({ symbolId, timeframe: 5 });
        const m15Data = buildStrategy.getSpecialData({ symbolId, timeframe: 15 });
        const h1Data = buildStrategy.getSpecialData({ symbolId, timeframe: 60 });

        {
            //using indicators


            if (STRATEGY === 'VAL01') {

                if (h1Data.macdBelowZero && h1Data.macdAboveSignal && h1Data.ema10BelowPrice && h1Data.prev.close > h1Data.prev.ema10) {
                    if (m15Data.macdBelowZero && m15Data.macdIsTrendingUp && m15Data.ema20BelowPrice && m15Data.prev.close > m15Data.prev.ema20) {
                        if (m5Data.macdBelowZero && m5Data.macdAboveSignal && m5Data.ema20BelowPrice && m5Data.prev.close > m5Data.prev.ema20) {
                            bid = m15Data.prev.close;
                            long = true;
                        }
                    }
                }


                if (true || h1Data.ema10AbovePrice && h1Data.macdTrendDown && h1Data.prev.close < h1Data.prev.ema10) {
                    if (m15Data.ema20AbovePrice && m15Data.macdBelowSignal && m15Data.macdTrendDown && m15Data.prev.close < m15Data.prev.ema20) {
                        if (m5Data.ema20AbovePrice && m5Data.macdBelowSignal && m5Data.macdTrendDown) {
                            short = true;
                        }
                    }
                }
            }
            /****************************max--------------------------*/
            if (STRATEGY === 'MAX01') {
                {

                    {
                        if (h1Data.macdAboveSignal && h1Data.ema10BelowPrice && h1Data.ema10Above20) {
                            if (h1Data.stochasticRSIKAboveD && h1Data.momentumIsTrendingUp /*&& h1Data.stochasticRSIKIsTrendingUp&& h1Data.stochasticRSIDIsTrendingUp*/) {
                                // if ((m15Data.stochasticRSIKAboveD /* && m15Data.momentumIsTrendingUp*/)) {
                                if ((m5Data.stochasticRSICrossingLowRefDistance === 1 && m5Data.first.stochasticRSIK < buildStrategy.STOCHASTIC_LOW_REF)) {
                                    bid = m5Data.prev.close + m5Data.prev.close * (-0.5 / 100);
                                    long = true
                                }
                            }
                            // }
                            /*  if ((m5Data.stochasticK < 40 && m5Data.stochasticKAboveD
                                && m5Data.momentumCrossingZeroDistance <= -1 && m5Data.momentumIsTrendingUp) /!*m15Data.momentumBelowZero*!/
                                || (m5Data.stochasticRSICrossingLowRefDistance = 1)) {
                                long = true
                            }*/
                        }
                        // if ((m5Data.stochasticK < 40 && m5Data.stochasticKAboveD
                        //     && m5Data.momentumCrossingZeroDistance <= -1 && m5Data.momentumIsTrendingUp) /*m15Data.momentumBelowZero*/
                        //     && (m5Data.stochasticRSICrossingLowRefDistance = 1)) {
                        //     long = true
                        // }

                    }
                    {
                        if (m5Data.stochasticRSICrossingHighRefDistance === -1 /*&& m5Data.first.stochasticRSIK > buildStrategy.STOCHASTIC_HIGH_REF*/) {
                            short = true
                        }
                        if (m15Data.stochasticRSIKAboveLowRef && m15Data.momentumTrendDown && (m15Data.stochasticRSIKBelowD || m15Data.stochasticRSIKAboveHighRef)) {
                            if (m5Data.stochasticRSIKInBands && m5Data.momentumTrendDown && m5Data.stochasticRSICrossingDistance < -1) {
                                short = true
                            }
                        }
                        //   short = short || trailingStop({ symbol });
                        /*   if ((m5Data.stochasticKBelowD && /!*m15Data.momentumAboveZero*!/ m5Data.momentumCrossingZeroDistance >= 1)
                                            || (m5Data.stochasticRSICrossingHighRefDistance <= -1)) {
                                            short = true
                                        }*/

                    }
                }
            }
            if (STRATEGY === 'MAX03') {
                {

                    {
                        if (
                            (m5Data.emaCrossingDistance > 1 && m5Data.ema10BelowPrice && m15Data.ema10Above20
                                && m5Data.last.rsi > 60 && m5Data.last.rsi < 80 && m5Data.rsiEstAGauche
                                && (!m5Data.priceCroissingEma10Point || m5Data.priceCroissingEma10Point > 5)
                            )
                        ) {
                            // bid = _.min([m5Data.prev.close, m5Data.last.close * (1 - Math.abs(viewTrend.trend[symbol].spread))]);
                            // bid = signal.open;
                            bid = _.min([m5Data.last.open, m5Data.last.close]);
                            long = true
                        }

                        if (
                            (m15Data.emaCrossingDistance > 1 && m15Data.ema10BelowPrice
                                && m15Data.rsiCrossingHighRefDistance > 1 && h1Data.rsiIsTrendingUp
                                && (!m15Data.priceCroissingEma10Point || m15Data.priceCroissingEma10Point > 5)
                            )
                        ) {
                            // bid = _.min([m5Data.prev.close, m5Data.last.close * (1 - Math.abs(viewTrend.trend[symbol].spread))]);
                            bid = _.min([m5Data.last.open, m5Data.last.close]);
                            long = true
                        }
                    }
                    {
                        if (m5Data.ema10Above20 && m5Data.ema20BelowPrice && m5Data.rsiEstADroite) {
                            skipShort = true
                        }
                    }
                }
            }

            if (STRATEGY === 'MAX05') {
                {

                    {
                        if ((m5Data.rsiCrossingHighRefDistance === 1)) {
                            // bid = _.min([m5Data.prev.close, m5Data.last.close * (1 - Math.abs(viewTrend.trend[symbol].spread))]);
                            // bid = signal.open;
                            bid = _.min([m5Data.last.open, m5Data.last.close]);
                            appEmitter.emit('analyse:max05:long', m5Data)
                            long = true
                        }
                    }
                    {
                        if (m5Data.ema10Above20 && m5Data.rsiAbove70) {
                            skipShort = true
                        }
                    }
                }
            }
        }
        // }
        /****************************pumping******************************/

        {
            //using trend

            if (STRATEGY === 'MAX02') {

                if (viewTrend.trend[symbolId].pumping && m5Data.rsiAbove70) {
                    bid = _.min([m5Data.last.open, m5Data.last.close]);
                    bid = _.min([bid, m5Data.last.close * (1 - 1 / 100)]);
                    long = true
                }
            }
            if (STRATEGY === 'MAX04') {
                // if (viewTrend.trend[symbol].pumping) {
                const pumpers = viewTrend.listPumpers();
                if (symbolId in pumpers) {
                    if (m5Data.rsiAbove70) {
                        // bid = _.max([m5Data.prev.close, m5Data.last.close * (1 - Math.abs(viewTrend.trend[symbol].spread))]);
                        bid = _.min([m5Data.last.open, m5Data.last.close]);
                        long = true
                    }
                }
            }
        }

        {
            if (long) {
                try {
                    bid && await stopLossBuy.tryTrade({ symbolId, close: signal.close, price: bid });
                    bid = bid || signal.close;
                    emitMessage(`${symbolId} START ${bid}`);
                    return appEmitter.emit('analyse:try_trade', {
                        signalData: _.extend({}, signal, { close: bid }),
                        signals
                    });
                } catch (e) {

                }
            } else {
                short = !skipShort && (short);
                /*   short = !skipShort && (short || trailingStop({
                    symbol,
                    target: env.SELL_LIMIT_PERCENT,
                    tradeMaxDuration: env.MAX_WAIT_TRADE_TIME,
                    minLoss: env.STOP_LOSS_PERCENT
                }));*/
                stopLossBuy.cancel({ symbolId })
            }

            if (short) {
                appEmitter.emit('analyse:stop_trade:' + symbolId, ({ signal }))
            }
        }
    }


    function viewTrend({ signal }) {
        initTrend();
        const CUSTOM_TIMEFRAME = (60 * 1e3) / 1;
        const PUMP_PERCENT = 1 / 1;
        const PIP = PUMP_PERCENT / CUSTOM_TIMEFRAME;

        const { symbolId, close } = signal;

        const trend = viewTrend.trend[symbolId] = viewTrend.trend[symbolId] || { symbolId }
        trend.pumping = false;
        if (!trend.started) {
            trend.started = true;
            trend.startTime = Date.now();
            trend.startPrice = close;
            trend.spread = 0;
            trend.tick = 0;
        } else {
            let change = getChangePercentage({ high: close, low: trend.startPrice });
            trend.spread = _.min([trend.spread, change - trend.change])
            if (trend.change !== change) {
                trend.change = change
                trend.maxChange = _.max([trend.change, trend.maxChange])
                trend.maxLoss = trend.maxChange - trend.change;
                trend.tick++

                trend.duration = (Date.now() - trend.startTime);
                {//version 02
                    // if (process.env.PUMP === 'v2') {
                    /*if (trend.change < 0) {
                        trend.started = false;
                    } else*/
                    {
                        if (trend.change >= 5 && trend.tick > 20) {
                            trend.pumping = true;
                        }
                        if (trend.maxLoss > 2) {
                            trend.pumping = false;
                        }
                    }
                    // }
                }
                // {//version 01
                //
                //     if (process.env.PUMP === 'v0') {
                //         if (trend.change < 0) {
                //             trend.started = false;
                //         } else if (trend.maxLoss > 1) {
                //             trend.started = false;
                //         } else if (trend.change >= PUMP_PERCENT && trend.duration < CUSTOM_TIMEFRAME) {
                //             trend.pumping = true;
                //         } else if (trend.change >= PUMP_PERCENT && trend.duration > CUSTOM_TIMEFRAME) {
                //             let duration2 = trend.duration - CUSTOM_TIMEFRAME;
                //             let change2 = trend.change - PUMP_PERCENT;
                //             if (change2 > PIP * duration2) {
                //                 trend.pumping = true //still pumping stopped
                //             } else {
                //                 trend.started = false;
                //             }
                //         } else if (trend.change < PUMP_PERCENT && trend.duration > CUSTOM_TIMEFRAME) {
                //             trend.started = false;
                //         }
                //     }
                // }
            }
        }
        trend.change > 1 && emitMessage(`${symbolId}  ${trend.change.toFixed(2)}% ${(trend.duration / 60e3).toFixed(2)} minutes ${trend.tick} tick ${trend.pumping ? 'pumper' : ''}`)

        function listPumpers() {

            return _.keys(viewTrend.trend).reduce((pumpers, symbolId) => {
                let trend = viewTrend.trend[symbolId];
                if ((trend.pumping || trend.change > 2) && trend.tick > 20) {
                    pumpers[symbolId] = trend
                }
                return pumpers;
            }, {});
        }

        function initTrend() {
            viewTrend.trend = viewTrend.trend || module.exports.trend
        }

        _.defaults(viewTrend, { listPumpers, initTrend });

    }


    function getChangePercentage({ high, low }) {
        return (high - low) / Math.abs(low) * 100;
    }

    function backupLastPoints({ count = 10, symbolId, timeframes = [5, 15, 60] }) {
        init();
        _.forEach(timeframes, savePoints);

        function savePoints(timeframe) {
            const points = getLastPoints({ symbolId, timeframe });
            const pivot = getPivotPoint({ symbolId, timeframe });
            let signal = signals[timeframe][symbolId];
            if (pivot.id || pivot.id && pivot.id !== signal.id) {//todo (pivot.id ||) is for testing
                points.push(_.extend({}, pivot));
                points.splice(0, points.length - count);
            }
            _.extend(pivot, signal);

        }

        function init() {
            backupLastPoints.tendances = backupLastPoints.tendances || {};
            backupLastPoints.tendances[symbolId] = backupLastPoints.tendances[symbolId] || {};
            backupLastPoints.pivot = backupLastPoints.pivot || {};
            backupLastPoints.pivot[symbolId] = backupLastPoints.pivot[symbolId] || {};

        }

        function getLastPoints({ symbolId, timeframe }) {
            return backupLastPoints.tendances [symbolId] [timeframe] = backupLastPoints.tendances [symbolId] [timeframe] || [];
        }


        function getPivotPoint({ symbolId, timeframe }) {
            return backupLastPoints.pivot [symbolId] [timeframe] = backupLastPoints.pivot [symbolId] [timeframe] || {};
        }

//
// function getLastUniqPoints({ symbol, timeframe, uniqCount = count }) {
//     const points = getLast3Points({ symbol, timeframe })
//     if (_.compact(points).length === 3 && _.uniqBy(points, 'id').length === uniqCount) {
//         return points;
//     }
// }

        _.defaults(backupLastPoints, { getLastPoints, getPivotPoint });
    }

    function buildStrategy({ symbolId, timeframes = [5, 15, 60], trendingQuote = 3 / 4 }) {
        init();

        _.forEach(timeframes, (timeframe) => {
            const data = buildSpecialData(timeframe);
            data && appEmitter.emit('analyse:newData', data)
        });

        function buildSpecialData(timeframe) {
            const specialData = getSpecialData({ symbolId, timeframe });

            const points = backupLastPoints.getLastPoints({ symbolId, timeframe });
            const pivot = backupLastPoints.getPivotPoint({ symbolId, timeframe });
            // const points = backupLast3Points.getLast3UniqPoints({ symbol, timeframe, uniqCount: timeframe < 60 ? 3 : 2 });
            const [last] = points.slice(-1);
            if (last) {


                _.extend(specialData, { points, candle: last });
                if (+timeframe === 5) {
                    _.range(0, 12).forEach(i => (++i, _.extend(specialData, { [`last${i * 5}mChange`]: _(points).slice(-i).sumBy('changeFromOpen') })))
                }
                {
                    _.extend(specialData, {
                            ema10Above20: last.ema10 > last.ema20,
                            ema10BelowPrice: last.ema10 < last.close,
                            ema10AbovePrice: last.ema10 > last.close,
                            ema20AbovePrice: last.ema20 > last.close,
                            ema20BelowPrice: last.ema20 < last.close,
                            emaDistance: getChangePercentage({ high: last.ema10, low: last.ema20 })
                        },
                        getTrendStatus({ trendingQuote, indicator: 'ema10', points }),
                        getTrendStatus({ trendingQuote, indicator: 'ema20', points }),
                        getCrossingPoint({ indicatorUp: 'ema10', indicatorDown: 'ema20', points }),
                        getCrossingPoint({ indicatorUp: 'close', indicatorDown: 'ema10', points }),
                    );

                }

                {
                    const RSi_HIGH_REF = 70;
                    const RSi_LOW_REF = 30;

                    _.extend(specialData, {
                            rsiAboveHighRef: last.rsi >= RSi_HIGH_REF,
                            rsiBelowHighRef: last.rsi < RSi_HIGH_REF,
                            rsiAboveLowRef: last.rsi > RSi_LOW_REF,
                            rsiBelowLowRef: last.rsi <= RSi_LOW_REF,
                            maxRsi: last.rsi < RSi_HIGH_REF ? null : _.max([last.rsi, specialData.maxRsi]),
                        },
                        getTrendStatus({ trendingQuote, indicator: 'rsi', points }),
                        getCrossingPoint({ indicatorUp: 'rsi', indicatorDown: 'point60', points, indicatorDownValue: 60 }),
                        getCrossingPoint({
                            indicatorUp: 'rsi',
                            indicatorDown: 'highRef',
                            points,
                            indicatorDownValue: RSi_HIGH_REF
                        }),
                        getCrossingPoint({
                            indicatorUp: 'rsi',
                            indicatorDown: 'lowRef',
                            points,
                            indicatorDownValue: RSi_LOW_REF
                        }),
                    );
                    let { rsi_point60CrossingDistance, rsiAboveHighRef, rsiBelowHighRef, rsiCrossingHighRefDistance } = specialData;
                    _.extend(specialData, {
                        rsiEstAGauche: (
                            rsi_point60CrossingDistance > 0 && rsiBelowHighRef && (!rsiCrossingHighRefDistance || rsiCrossingHighRefDistance > 0)
                        )
                        || (rsiAboveHighRef && last.rsi === specialData.maxRsi)
                    });

                }

                {

                    _.extend(specialData, {
                            macdAboveSignal: last.macd > last.macd_signal,
                            macdBelowSignal: last.macd < last.macd_signal,
                            macdAboveZero: last.macd > 0,
                            macdBelowZero: last.macd < 0,
                            macdSignalAboveZero: last.macd_signal > 0,
                        },
                        getTrendStatus({ trendingQuote, indicator: 'macd', points }),
                        getTrendStatus({ trendingQuote, indicator: 'macd_signal', points }),
                        getCrossingPoint({ indicatorUp: 'macd', indicatorDown: 'macd_signal', points }),
                    );


                    specialData.macdAboveSignal = last.macd > last.macd_signal;
                    specialData.macdBelowSignal = last.macd < last.macd_signal;
                    specialData.macdIsTrendingUp = isSorted([first.macd, prev.macd, last.macd,]);
                    specialData.macdTrendDown = isSorted([first.macd, prev.macd, last.macd,].reverse());
                    specialData.macdSignalIsTrendingUp = isSorted([first.macd_signal, prev.macd_signal, last.macd_signal,]);

                    let crossingPoint = getCrossingPoint({ up: 'macd', down: 'macd_signal', points });
                    crossingPoint = specialData.macdCrossingPoint = crossingPoint //|| specialData.macdCrossingPoint;
                    specialData.macdCrossingDistance = countCandle({ crossingPoint, timeframe });

                    specialData.macdAboveZero = last.macd > 0
                    specialData.macdBelowZero = last.macd < 0
                    specialData.macdSignalAboveZero = last.macd_signal > 0
                }
                {
                    const ADX_REF = 25;
                    _.defaults(buildStrategy, { ADX_REF });
                    first.adx_ref = prev.adx_ref = last.adx_ref = ADX_REF;
                    {
                        specialData.diPlusAboveMinus = last.adx_plus_di > last.adx_minus_di;
                        specialData.diPlusIsTrendingUp = isSorted([first.adx_plus_di, prev.adx_plus_di, last.adx_plus_di,]);
                        specialData.diMinusTrendDown = isSorted([first.adx_minus_di, prev.adx_minus_di, last.adx_minus_di,].reverse());
                        let crossingPoint = getCrossingPoint({ up: 'adx_plus_di', down: 'macd_signal', points });
                        crossingPoint = specialData.diCrossingPoint = crossingPoint //|| specialData.diCrossingPoint;
                        specialData.diCrossingDistance = countCandle({ crossingPoint, timeframe });

                        specialData.diPlusAboveAdxRef = last.adx_plus_di > ADX_REF
                        specialData.diMinusBelowAdxRef = last.adx_minus_di < ADX_REF
                        specialData.diDistance = last.adx_plus_di - last.adx_minus_di;
                    }
                    {
                        specialData.adxValue = last.adx
                        specialData.adxAboveRef = last.adx > ADX_REF
                        specialData.adxIsTrendingUp = isSorted([first.adx, prev.adx, last.adx,]);
                        specialData.adxEcart = _.min([last.adx - prev.adx, prev.adx - first.adx]);

                        let crossingPoint = getCrossingPoint({ up: 'adx', down: 'adx_ref', points });
                        crossingPoint = specialData.adxCrossingPoint = crossingPoint //|| specialData.adxCrossingPoint;
                        specialData.adxCrossingDistance = countCandle({ crossingPoint, timeframe });

                    }
                }

                {
                    const STOCHASTIC_LOW_REF = 20;
                    const STOCHASTIC_HIGH_REF = 80;
                    _.defaults(buildStrategy, { STOCHASTIC_LOW_REF, STOCHASTIC_HIGH_REF });
                    {
                        first.stochasticLowRef = prev.stochasticLowRef = last.stochasticLowRef = STOCHASTIC_LOW_REF;
                        first.stochasticHighRef = prev.stochasticHighRef = last.stochasticHighRef = STOCHASTIC_HIGH_REF;

                        specialData.stochasticKAboveD = last.stochasticK > last.stochasticD
                        specialData.stochasticKBelowD = last.stochasticK < last.stochasticD

                        let crossingPoint = getCrossingPoint({ up: 'stochasticK', down: 'stochasticD', points });
                        crossingPoint = specialData.stochasticCrossingPoint = crossingPoint //|| specialData.stochasticCrossingPoint;
                        specialData.stochasticCrossingDistance = countCandle({ crossingPoint, timeframe });

                        crossingPoint = getCrossingPoint({ up: 'stochasticK', down: 'stochasticLowRef', points });
                        crossingPoint = specialData.stochasticCrossingLowRefPoint = crossingPoint //|| specialData.stochasticCrossingLowRefPoint;
                        specialData.stochasticCrossingLowRefDistance = countCandle({ crossingPoint, timeframe });

                        crossingPoint = getCrossingPoint({ up: 'stochasticK', down: 'stochasticHighRef', points });
                        crossingPoint = specialData.stochasticCrossingHighRefPoint = crossingPoint //|| specialData.stochasticCrossingHighRefPoint;
                        specialData.stochasticCrossingHighRefDistance = countCandle({ crossingPoint, timeframe });
                    }
                    {
                        first.stochasticRSILowRef = prev.stochasticRSILowRef = last.stochasticRSILowRef = STOCHASTIC_LOW_REF;
                        first.stochasticRSIHighRef = prev.stochasticRSIHighRef = last.stochasticRSIHighRef = STOCHASTIC_HIGH_REF;

                        specialData.stochasticRSIKAboveD = last.stochasticRSIK > last.stochasticRSID
                        specialData.stochasticRSIKBelowD = last.stochasticRSIK < last.stochasticRSID
                        specialData.stochasticRSIDistance = Math.abs(last.stochasticRSIK - last.stochasticRSID)
                        specialData.stochasticRSIKAboveHighRef = last.stochasticRSIK > STOCHASTIC_HIGH_REF
                        specialData.stochasticRSIKBelowHighRef = last.stochasticRSIK < STOCHASTIC_HIGH_REF
                        specialData.stochasticRSIKAboveLowRef = last.stochasticRSIK > STOCHASTIC_LOW_REF
                        specialData.stochasticRSIKBelowLowRef = last.stochasticRSIK < STOCHASTIC_LOW_REF
                        specialData.stochasticRSIKInBands = specialData.stochasticRSIKBelowHighRef && specialData.stochasticRSIKAboveLowRef
                        specialData.stochasticRSIKIsTrendingUp = isSorted([first.stochasticRSIK, prev.stochasticRSIK, last.stochasticRSIK,]);
                        specialData.stochasticRSIDIsTrendingUp = isSorted([first.stochasticRSID, prev.stochasticRSID, last.stochasticRSID,]);

                        let crossingPoint = getCrossingPoint({ up: 'stochasticRSIK', down: 'stochasticRSID', points });
                        crossingPoint = specialData.stochasticRSICrossingPoint = crossingPoint //|| specialData.stochasticRSICrossingPoint;
                        specialData.stochasticRSICrossingDistance = countCandle({ crossingPoint, timeframe });

                        crossingPoint = getCrossingPoint({ up: 'stochasticRSIK', down: 'stochasticRSILowRef', points });
                        crossingPoint = specialData.stochasticRSICrossingLowRefPoint = crossingPoint //|| specialData.stochasticRSICrossingLowRefPoint;
                        specialData.stochasticRSICrossingLowRefDistance = countCandle({ crossingPoint, timeframe });

                        crossingPoint = getCrossingPoint({ up: 'stochasticRSIK', down: 'stochasticRSIHighRef', points });
                        crossingPoint = specialData.stochasticRSICrossingHighRefPoint = crossingPoint //|| specialData.stochasticRSICrossingHighRefPoint;
                        specialData.stochasticRSICrossingHighRefDistance = countCandle({ crossingPoint, timeframe });
                    }
                }
                {
                    const MOMENTUM_MEDIAN = 0
                    first.momentumMedian = prev.momentumMedian = last.momentumMedian = MOMENTUM_MEDIAN;

                    specialData.momentumAboveZero = last.momentum > 0
                    specialData.momentumBelowZero = last.momentum < 0
                    // specialData.minMomentum = last.momentum > 0 ? 0 : _.min([specialData.minMomentum, last.momentum])
                    // specialData.maxMomentum = last.momentum < 0 ? 0 : _.max([specialData.maxMomentum, last.momentum])
                    specialData.momentumIsTrendingUp = prev.momentum < last.momentum
                    specialData.momentumTrendDown = prev.momentum > last.momentum
                    let crossingPoint = getCrossingPoint({ up: 'momentum', down: 'momentumMedian', points });
                    crossingPoint = specialData.momentumCrossingZeroPoint = crossingPoint //|| specialData.momentumCrossingPoint;
                    specialData.momentumCrossingZeroDistance = countCandle({ crossingPoint, timeframe });

                }
                {
                    //DEBUG
                    let {
                        ema10Above20, emaDistance, emaCrossingPoint, ema10IsTrendingUp, ema20IsTrendingUp, emaCrossingDistance,
                        macdCrossingPoint, macdAboveSignal, macdAboveZero, macdSignalAboveZero, macdSignalIsTrendingUp, macdIsTrendingUp, macdCrossingDistance,
                        diCrossingPoint, diCrossingDistance, diDistance, diMinusBelowAdxRef, diMinusTrendDown, diPlusAboveAdxRef, diPlusAboveMinus, diPlusIsTrendingUp,
                        adxAboveRef, adxIsTrendingUp, absenceDePique, adxEcart, adxValue, adxCrossingPoint, adxCrossingDistance,
                        rsiEstAGauche, rsiCrossing60Distance
                    } = specialData;
                    //     if (ema10IsTrendingUp) {
                    //         emitMessage(`${symbol} ${timeframe} ema 10 Trending Up `)
                    //     }
                    //     if (macdIsTrendingUp) {
                    //         emitMessage(`${symbol} ${timeframe} macd Trending Up `)
                    //     }
                    //     // if (emaCrossingPoint) {
                    //     //     emitMessage(`${symbol} ${timeframe} ema crossing ${emaCrossingPoint.crossing_up ? 'Up' : 'Down'} [${emaCrossingPoint.point.ema10},${emaCrossingPoint.point.ema20}] distance: ${emaCrossingDistance}`)
                    //     // }
                    //     if (macdCrossingPoint) {
                    //         emitMessage(`${symbol} ${timeframe} macd crossing ${macdCrossingPoint.crossing_up ? 'Up' : 'Down'} [${macdCrossingPoint.point.macd},${macdCrossingPoint.point.macd_signal}] distance: ${macdCrossingDistance}`)
                    //
                    //     }
                    //     // if (diCrossingPoint) {
                    //     //     emitMessage(`${symbol} ${timeframe} DI crossing ${diCrossingPoint.crossing_up ? 'Up' : 'Down'} [${diCrossingPoint.point.adx_plus_di},${diCrossingPoint.point.adx_minus_di}] distance: ${diCrossingDistance}`)
                    //     // }
                    // if (rsiEstAGauche) {
                    //     emitMessage(`${symbol} ${timeframe} rsiEstAGauche ${rsiCrossing60Distance}`)
                    // }
                }

                return specialData;
            }


        }


        function init() {
            buildStrategy.specialData = buildStrategy.specialData || {};
            buildStrategy.specialData[symbolId] = buildStrategy.specialData[symbolId] || {};
        }

        function getSpecialData({ symbolId, timeframe }) {
            return buildStrategy.specialData[symbolId][timeframe] = buildStrategy.specialData[symbolId][timeframe] || {
                symbolId,
                timeframe
            };
        }

        _.defaults(buildStrategy, { getSpecialData, });

    }

    function getTrendStatus({ trendingQuote, indicator, points, reversed = false }) {
        let max = _.maxBy(points, indicator);
        let min = _.minBy(points, indicator);
        let avgMinimum = max * trendingQuote + min * (1 - trendingQuote);
        let trendRes = trend(_.map(points, indicator), { avgMinimum, reversed });
        return { [`${indicator}Trend`]: trendRes, [`${indicator}IsTrendingUp`]: trendRes > 1 }

    }

    function getCrossingStatus({ indicatorUp, indicatorDown, zero = 0 }) {
        let [upPrev, upCurr] = indicatorUp.slice(-2);
        let [downPrev, downCurr] = indicatorDown.slice(-2);
        let prevChange = getChangePercentage({ high: upPrev, low: downPrev });
        let lastChange = getChangePercentage({ high: upCurr, low: downCurr });
        let crossingUp = prevChange <= zero && lastChange > zero;
        let crossingDown = prevChange >= -zero && lastChange < zero;
        return { crossingUp, crossingDown };
    }


    function getCrossingPoint({ indicatorUp, indicatorDown, points, indicatorDownValue, timeframe, zero }) {
        let iDown = _.capitalize(indicatorDown)
        if (points.length >= 2) {
            let [prevPoint, lastPoint] = points.slice(-2);
            let { crossingDown, crossingUp } = getCrossingStatus({
                indicatorUp: [prevPoint[indicatorUp], lastPoint[indicatorUp]],
                indicatorDown: [prevPoint[indicatorDown] || indicatorDownValue, lastPoint[indicatorDown] || indicatorDownValue],
                zero
            });
            if (crossingUp || crossingDown) {

                return _.extend({
                    [`${indicatorUp}IsCrossing${iDown}`]: true,
                    [`${indicatorUp}IsCrossingUp${iDown}`]: crossingUp,
                    [`${indicatorUp}IsCrossingDown${iDown}`]: crossingDown,
                    [`${indicatorUp}${iDown}CrossingDistance`]: countCandle({ candle: lastPoint, timeframe, crossingUp })
                });
            } else {
                return getCrossingPoint({ indicatorUp, indicatorDown, points: _.initial(points), zero })
            }
        }
        return {
            [`${indicatorUp}IsCrossing${iDown}`]: false,
        };
    }


    function countCandle({ candle, timeframe, crossingUp }) {
        if (candle) {
            const id = candle.id;
            const count = 1 + Math.trunc((Date.now() / (timeframesIntervals[timeframe]))) - id;

            return crossingUp ? count : -count;
        }
        return null
    }

// function estFiable({ symbol }) {
//     let closed = _.first(_.orderBy(_.filter(trader.closedTrades, { symbol: symbol }), 'time', 'desc'));
//     if (closed && Date.now() - closed.time < 60e3) {
//         return closed.success
//     } else {
//         return true;
//     }
// }

    listenToEvents();
}
