const debug = require('debug')('analyse');
const _ = require('lodash');
const isSorted = require('is-sorted');
const Promise = require('bluebird');
const { getSignalResult } = require('../analyse/analyser');
let { settingsByIndicators: indicatorSettings } = require('./indicators');

// const trader = require('../trade');
const { fetchDepth, fetch24HTrend, fetchLongTrend } = require('../utils')();
const TIMEFRAMES = env.TIMEFRAMES;
const TIMEFRAME = env.TIMEFRAME;
const signals = _.reduce(TIMEFRAMES, (st, tf) => Object.assign(st, { [tf]: {} }), {});

function listenToEvents() {
    appEmitter.on('tv:signals', async ({ markets, timeframe }) => {
        signals[timeframe] = markets;
        timeframe == TIMEFRAME && await analyse(markets);
    });

}

async function analyse(markets) {

    if (!analyse.running) {
        analyse.running = true;
        try {
            await Promise.each(_.keys(markets), async (symbol) => {
                await Promise.each(TIMEFRAMES, async (timeframe) => {
                    let signal = signals[timeframe][symbol];
                    if (signal) {
                        _.extend(signal, { timeframe });
                        timeframe == TIMEFRAME && checkSignal({ signal });
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
    stopLossBuy.signal = signal;
    stopLossBuy.symbols = stopLossBuy.symbols || {};
    _.keys(stopLossBuy.symbols).forEach(symbol => stopLossBuy.symbols[symbol].tryAgain());

    async function tryTrade({ symbol, price }) {
        if (!stopLossBuy.symbols[symbol]) {
            stopLossBuy.symbols[symbol] = {};
            return stopLossBuy.symbols[symbol].promise = new Promise((resolve, reject) => {
                stopLossBuy.symbols[symbol].resolve = function () {
                    resolve();
                    delete stopLossBuy.symbols[symbol]
                };
                stopLossBuy.symbols[symbol].reject = function () {
                    reject();
                    delete stopLossBuy.symbols[symbol]
                };
                stopLossBuy.symbols[symbol].tryAgain = function () {
                    if (stopLossBuy.signal.close <= price) {
                        stopLossBuy.symbols[symbol].resolve()
                    }
                };
                stopLossBuy.symbols[symbol].tryAgain();
            })
        }
        return stopLossBuy[symbol]
    }

    function cancel({ symbol }) {
        if (stopLossBuy.symbols[symbol]) {
            stopLossBuy.symbols[symbol].reject()
        }
    }

    _.defaults(stopLossBuy, { tryTrade, cancel })
}

async function checkSignal({ signal }) {
    const { symbol } = signal;
    const timeframes = env.TIMEFRAMES;
    backupLast3Points({ symbol, timeframes });
    buildStrategy({ symbol, timeframes });
    stopLossBuy(signal);
    const m5Data = buildStrategy.getSpecialData({ symbol, timeframe: 5 });
    const m15Data = buildStrategy.getSpecialData({ symbol, timeframe: 15 });
    const h1Data = buildStrategy.getSpecialData({ symbol, timeframe: 60 });

    // return appEmitter.emit('analyse:try_trade', {
    //     signalData: _.extend({}, signal, { /*close: prevClosePrice*/ }),
    //     signals
    // });

    let long;
    let short;
    let prevClosePrice;
    if (process.env.VAL01) {

        if (/*h1Data.macdBelowZero &&*/ h1Data.macdAboveSignal && h1Data.ema10BelowPrice && h1Data.prev.close > h1Data.prev.ema10) {
            if (m15Data.macdBelowZero && m15Data.macdTrendUp && m15Data.ema20BelowPrice && m15Data.prev.close > m15Data.prev.ema20) {
                if (m5Data.macdBelowZero && m5Data.macdAboveSignal && m5Data.ema20BelowPrice && m5Data.prev.close > m5Data.prev.ema20) {
                    prevClosePrice = m15Data.prev.close;
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
    if (process.env.MAX01) {
        {

            {
                if (h1Data.stochasticRSIKAboveD && h1Data.momentumTrendUp) {
                    if ((m15Data.stochasticRSIKAboveD && m15Data.stochasticRSIKBelowHighRef/* && m15Data.momentumTrendUp*/)) {
                        if ((m5Data.stochasticRSICrossingLowRefDistance === 1 && m5Data.first.stochasticRSIK < buildStrategy.STOCHASTIC_LOW_REF)) {
                            prevClosePrice = m5Data.prev.close;
                            long = true
                        }
                    }
                    /*  if ((m5Data.stochasticK < 40 && m5Data.stochasticKAboveD
                        && m5Data.momentumCrossingZeroDistance <= -1 && m5Data.momentumTrendUp) /!*m15Data.momentumBelowZero*!/
                        || (m5Data.stochasticRSICrossingLowRefDistance = 1)) {
                        long = true
                    }*/
                }
                // if ((m5Data.stochasticK < 40 && m5Data.stochasticKAboveD
                //     && m5Data.momentumCrossingZeroDistance <= -1 && m5Data.momentumTrendUp) /*m15Data.momentumBelowZero*/
                //     && (m5Data.stochasticRSICrossingLowRefDistance = 1)) {
                //     long = true
                // }

            }
            {
                if (m5Data.stochasticRSICrossingHighRefDistance === -1 && m5Data.first.stochasticRSIK > buildStrategy.STOCHASTIC_HIGH_REF) {
                    short = true
                }
                if (m15Data.stochasticRSIKAboveLowRef && (m15Data.stochasticRSIKBelowD || m15Data.stochasticRSIKAboveHighRef)) {
                    if (m5Data.stochasticRSIKInBands && m5Data.stochasticRSICrossingDistance <= -1) {
                        short = true
                    }
                }
                /*   if ((m5Data.stochasticKBelowD && /!*m15Data.momentumAboveZero*!/ m5Data.momentumCrossingZeroDistance >= 1)
                                    || (m5Data.stochasticRSICrossingHighRefDistance <= -1)) {
                                    short = true
                                }*/

            }
        }
    }

    {
        if (long) {
            try {
                await stopLossBuy.tryTrade({ symbol, price: prevClosePrice });
                emitMessage(`${symbol} START ${prevClosePrice}`);
                return appEmitter.emit('analyse:try_trade', {
                    signalData: _.extend({}, signal, { close: prevClosePrice }),
                    signals
                });
            } catch (e) {

            }
        } else {
            stopLossBuy.cancel({ symbol })
        }

        if (short) {
            appEmitter.emit('analyse:stop_trade:' + symbol, ({ signal }))
        }
    }
}


function getGain({ high, low }) {
    return (high - low) / Math.abs(low) * 100;
}

function backupLast3Points({ symbol, timeframes = [5, 15, 60] }) {
    init();
    _.forEach(timeframes, savePoints);

    function savePoints(timeframe) {
        const points = getLast3Points({ symbol, timeframe });
        let signal = signals[timeframe][symbol];
        if (signal) {
            // let { symbol } = signal
            let [first, prev, last] = points;
            if (!last) {
                points.push(signal)
            } else if (first.id === prev.id) {
                points.shift();
                points.push(signal);
            } else if (prev.id === last.id) {
                points.splice(1, 1);
                points.push(signal);
            } else if (last.id === signal.id) {
                points.splice(2, 1, signal)
            } else {
                points.shift();
                points.push(signal);

            }
        }
    }

    function init() {
        backupLast3Points.tendances = backupLast3Points.tendances || {};
        backupLast3Points.tendances[symbol] = backupLast3Points.tendances[symbol] || {};

    }

    function getLast3Points({ symbol, timeframe }) {
        return backupLast3Points.tendances [symbol] [timeframe] = backupLast3Points.tendances [symbol] [timeframe] || [];
    }

    function getLast3UniqPoints({ symbol, timeframe, uniqCount = 3 }) {
        const points = getLast3Points({ symbol, timeframe })
        if (_.compact(points).length === 3 && _.uniqBy(points, 'id').length === uniqCount) {
            return points;
        }
    }

    _.extend(backupLast3Points, { getLast3Points, getLast3UniqPoints });
}

function buildStrategy({ symbol, timeframes = [5, 15, 60] }) {
    init();

    _.forEach(timeframes, buildSpecialData);

    function buildSpecialData(timeframe) {
        let specialData = getSpecialData({ symbol, timeframe });

        const points = backupLast3Points.getLast3Points({ symbol, timeframe });
        // const points = backupLast3Points.getLast3UniqPoints({ symbol, timeframe, uniqCount: timeframe < 60 ? 3 : 2 });
        if (points && points.length > 2) {

            const [first, prev, last] = points;
            _.extend(specialData, { points, first, prev, last });
            {
                specialData.ema10Above20 = last.ema10 > last.ema20;
                specialData.ema10BelowPrice = last.ema10 < last.close;
                specialData.ema10AbovePrice = last.ema10 > last.close;
                specialData.ema20AbovePrice = last.ema20 > last.close;
                specialData.ema20BelowPrice = last.ema20 < last.close;
                specialData.ema10TrendUp = isSorted([first.ema10, prev.ema10, last.ema10,]);
                specialData.ema20TrendUp = isSorted([first.ema20, prev.ema20, last.ema20,]);

                let crossingPoint = getCrossingPoint({ up: 'ema10', down: 'ema20', points, });
                crossingPoint = specialData.emaCrossingPoint = crossingPoint || specialData.emaCrossingPoint;
                specialData.emaCrossingDistance = countCandle({ crossingPoint, timeframe });

                specialData.emaDistance = getGain({ high: last.ema10, low: last.ema20 });
            }
            {
                specialData.macdAboveSignal = last.macd > last.macd_signal;
                specialData.macdBelowSignal = last.macd < last.macd_signal;
                specialData.macdTrendUp = isSorted([first.macd, prev.macd, last.macd,]);
                specialData.macdTrendDown = isSorted([first.macd, prev.macd, last.macd,].reverse());
                specialData.macdSignalTrendUp = isSorted([first.macd_signal, prev.macd_signal, last.macd_signal,]);

                let crossingPoint = getCrossingPoint({ up: 'macd', down: 'macd_signal', points });
                crossingPoint = specialData.macdCrossingPoint = crossingPoint || specialData.macdCrossingPoint;
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
                    specialData.diPlusTrendUp = isSorted([first.adx_plus_di, prev.adx_plus_di, last.adx_plus_di,]);
                    specialData.diMinusTrendDown = isSorted([first.adx_minus_di, prev.adx_minus_di, last.adx_minus_di,].reverse());
                    let crossingPoint = getCrossingPoint({ up: 'adx_plus_di', down: 'macd_signal', points });
                    crossingPoint = specialData.diCrossingPoint = crossingPoint || specialData.diCrossingPoint;
                    specialData.diCrossingDistance = countCandle({ crossingPoint, timeframe });

                    specialData.diPlusAboveAdxRef = last.adx_plus_di > ADX_REF
                    specialData.diMinusBelowAdxRef = last.adx_minus_di < ADX_REF
                    specialData.diDistance = last.adx_plus_di - last.adx_minus_di;
                }
                {
                    specialData.adxValue = last.adx
                    specialData.adxAboveRef = last.adx > ADX_REF
                    specialData.adxTrendUp = isSorted([first.adx, prev.adx, last.adx,]);
                    specialData.adxEcart = _.min([last.adx - prev.adx, prev.adx - first.adx]);

                    let crossingPoint = getCrossingPoint({ up: 'adx', down: 'adx_ref', points });
                    crossingPoint = specialData.adxCrossingPoint = crossingPoint || specialData.adxCrossingPoint;
                    specialData.adxCrossingDistance = countCandle({ crossingPoint, timeframe });

                }
            }
            {
                specialData.rsiAbove70 = last.rsi >= 70;
                specialData.rsiBelow30 = last.rsi <= 30;
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
                    crossingPoint = specialData.stochasticCrossingPoint = crossingPoint || specialData.stochasticCrossingPoint;
                    specialData.stochasticCrossingDistance = countCandle({ crossingPoint, timeframe });

                    crossingPoint = getCrossingPoint({ up: 'stochasticK', down: 'stochasticLowRef', points });
                    crossingPoint = specialData.stochasticCrossingLowRefPoint = crossingPoint || specialData.stochasticCrossingLowRefPoint;
                    specialData.stochasticCrossingLowRefDistance = countCandle({ crossingPoint, timeframe });

                    crossingPoint = getCrossingPoint({ up: 'stochasticK', down: 'stochasticHighRef', points });
                    crossingPoint = specialData.stochasticCrossingHighRefPoint = crossingPoint || specialData.stochasticCrossingHighRefPoint;
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

                    let crossingPoint = getCrossingPoint({ up: 'stochasticRSIK', down: 'stochasticRSID', points });
                    crossingPoint = specialData.stochasticRSICrossingPoint = crossingPoint || specialData.stochasticRSICrossingPoint;
                    specialData.stochasticRSICrossingDistance = countCandle({ crossingPoint, timeframe });

                    crossingPoint = getCrossingPoint({ up: 'stochasticRSIK', down: 'stochasticRSILowRef', points });
                    crossingPoint = specialData.stochasticRSICrossingLowRefPoint = crossingPoint || specialData.stochasticRSICrossingLowRefPoint;
                    specialData.stochasticRSICrossingLowRefDistance = countCandle({ crossingPoint, timeframe });

                    crossingPoint = getCrossingPoint({ up: 'stochasticRSIK', down: 'stochasticRSIHighRef', points });
                    crossingPoint = specialData.stochasticRSICrossingHighRefPoint = crossingPoint || specialData.stochasticRSICrossingHighRefPoint;
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
                specialData.momentumTrendUp = prev.momentum < last.momentum
                specialData.momentumTrendDown = prev.momentum > last.momentum
                let crossingPoint = getCrossingPoint({ up: 'momentum', down: 'momentumMedian', points });
                crossingPoint = specialData.momentumCrossingZeroPoint = crossingPoint || specialData.momentumCrossingPoint;
                specialData.momentumCrossingZeroDistance = countCandle({ crossingPoint, timeframe });

            }
            // {
            //     //DEBUG
            //     let {
            //         ema10Above20, emaDistance, emaCrossingPoint, ema10TrendUp, ema20TrendUp, emaCrossingDistance,
            //         macdCrossingPoint, macdAboveSignal, macdAboveZero, macdSignalAboveZero, macdSignalTrendUp, macdTrendUp, macdCrossingDistance,
            //         diCrossingPoint, diCrossingDistance, diDistance, diMinusBelowAdxRef, diMinusTrendDown, diPlusAboveAdxRef, diPlusAboveMinus, diPlusTrendUp,
            //         adxAboveRef, adxTrendUp, absenceDePique, adxEcart, adxValue, adxCrossingPoint, adxCrossingDistance
            //     } = specialData;
            //     if (ema10TrendUp) {
            //         emitMessage(`${symbol} ${timeframe} ema 10 Trending Up `)
            //     }
            //     if (macdTrendUp) {
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
            //     // if (adxCrossingPoint) {
            //     //     emitMessage(`${symbol} ${timeframe} ADX crossing ${adxCrossingPoint.crossing_up ? 'Up' : 'Down'} [${adxValue}] distance: ${adxCrossingDistance}`)
            //     // }
            // }

        }

    }


    function init() {
        buildStrategy.specialData = buildStrategy.specialData || {};
        buildStrategy.specialData[symbol] = buildStrategy.specialData[symbol] || {};
    }

    function getSpecialData({ symbol, timeframe }) {
        return buildStrategy.specialData[symbol][timeframe] = buildStrategy.specialData[symbol][timeframe] || {};
    }

    _.defaults(buildStrategy, { getSpecialData, });

}

function getCrossingStatus({ up, down, zero = 0 }) {
    let [upPrev, upCurr] = up.slice(-2);
    let [downPrev, downCurr] = down.slice(-2);
    let crossing_up = getGain({ high: upPrev, low: downPrev }) <= zero && getGain({ high: upCurr, low: downCurr }) > 0;
    let crossing_down = getGain({ high: upPrev, low: downPrev }) >= -zero && getGain({ high: upCurr, low: downCurr }) < 0;
    return (crossing_up || crossing_down) && { crossing_up, crossing_down };
}


function getCrossingPoint({ up, down, points, zero }) {
    if (points.length >= 2) {
        let [pt0, pt1] = points.slice(-2);
        let status = getCrossingStatus({ up: [pt0[up], pt1[up]], down: [pt0[down], pt1[down]], zero });
        if (status) {
            return Object.assign(status, { point: pt1 });
        } else {
            return getCrossingPoint({ up, down, points: _.initial(points), zero })
        }
    }
    return null;
}


function countCandle({ crossingPoint, timeframe }) {
    if (crossingPoint) {
        const id = crossingPoint.point.id;
        const count = 1 + Math.trunc((Date.now() / (env.timeframesIntervals[timeframe]))) - id;

        if (crossingPoint.crossing_down) {
            return -count;
        }
        return count;
    }
    // return -Infinity
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
