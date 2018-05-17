const debug = require('debug')('analyse');
const _ = require('lodash');
const isSorted = require('is-sorted');
const Promise = require('bluebird');
const { getSignalResult } = require('../analyse/analyser');
let { settingsByIndicators: indicatorSettings } = require('./indicators');
const { openTrades } = require('../trade')
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
    stopLossBuy.symbols = stopLossBuy.symbols || {};
    const { close, symbol } = signal;
    // _.keys(stopLossBuy.symbols).forEach(symbol => stopLossBuy.symbols[symbol].tryAgain());
    stopLossBuy.symbols[symbol] && stopLossBuy.symbols[symbol].tryAgain({ close });

    async function tryTrade({ symbol, price, close }) {
        if (!stopLossBuy.symbols[symbol]) {
            stopLossBuy.symbols[symbol] = {};
            return stopLossBuy.symbols[symbol].promise = new Promise((resolve, reject) => {
                stopLossBuy.symbols[symbol].resolve = function () {
                    resolve();
                    emitMessage(symbol + ' Trade Accepted')

                };
                stopLossBuy.symbols[symbol].reject = function () {
                    reject();
                    emitMessage(symbol + ' Trade Rejected')
                };
                stopLossBuy.symbols[symbol].tryAgain = function ({ close }) {
                    if (close <= price) {
                        stopLossBuy.symbols[symbol].resolve()
                    }
                };
                stopLossBuy.symbols[symbol].tryAgain({ close });
            }).finally(() => delete stopLossBuy.symbols[symbol])
        }
        return stopLossBuy.symbols[symbol].promise;
    }

    function cancel({ symbol }) {
        if (stopLossBuy.symbols[symbol]) {
            stopLossBuy.symbols[symbol].reject()
        }
    }

    _.defaults(stopLossBuy, { tryTrade, cancel })
}

function trailingStop({ symbol, target, tradeMaxDuration, minLoss }) {
    let short;
    if (symbol in openTrades) {
        let trade = openTrades[symbol];
        if (trade.gainOrLoss > .5) {
            trade.winning = true;
        }
        if (trade.winning) {
            let loss = getGain({ high: trade.gainOrLoss, low: trade.maxGain });
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
    const { close: last, symbol } = signal
    tick.symbols = tick.symbols || {}
    const points = tick.symbols[symbol] = tick.symbols[symbol] || { ticks: [newTick()] };
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
    const { symbol } = signal;
    const timeframes = env.TIMEFRAMES;
    stopLossBuy(signal);
    tick(signal)
    let long;
    let short, skipShort;
    let bid;

    viewTrend({ signal })

    backupLast3Points({ symbol, timeframes });
    buildStrategy({ symbol, timeframes });
    const m5Data = buildStrategy.getSpecialData({ symbol, timeframe: 5 });
    const m15Data = buildStrategy.getSpecialData({ symbol, timeframe: 15 });
    const h1Data = buildStrategy.getSpecialData({ symbol, timeframe: 60 });

    {
        //using indicators

        if (process.env.VAL01) {

            if (h1Data.macdBelowZero && h1Data.macdAboveSignal && h1Data.ema10BelowPrice && h1Data.prev.close > h1Data.prev.ema10) {
                if (m15Data.macdBelowZero && m15Data.macdTrendUp && m15Data.ema20BelowPrice && m15Data.prev.close > m15Data.prev.ema20) {
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
        if (process.env.MAX01) {
            {

                {
                    if (h1Data.macdAboveSignal && h1Data.ema10BelowPrice && h1Data.ema10Above20) {
                        if (h1Data.stochasticRSIKAboveD && h1Data.momentumTrendUp /*&& h1Data.stochasticRSIKTrendUp&& h1Data.stochasticRSIDTrendUp*/) {
                            // if ((m15Data.stochasticRSIKAboveD /* && m15Data.momentumTrendUp*/)) {
                            if ((m5Data.stochasticRSICrossingLowRefDistance === 1 && m5Data.first.stochasticRSIK < buildStrategy.STOCHASTIC_LOW_REF)) {
                                bid = m5Data.prev.close + m5Data.prev.close * (-0.5 / 100);
                                long = true
                            }
                        }
                        // }
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
                    if (m5Data.stochasticRSICrossingHighRefDistance === -1 /*&& m5Data.first.stochasticRSIK > buildStrategy.STOCHASTIC_HIGH_REF*/) {
                        short = true
                    }
                    if (m15Data.stochasticRSIKAboveLowRef && m15Data.momentumTrendDown && (m15Data.stochasticRSIKBelowD || m15Data.stochasticRSIKAboveHighRef)) {
                        if (m5Data.stochasticRSIKInBands && m5Data.momentumTrendDown && m5Data.stochasticRSICrossingDistance < -1) {
                            short = true
                        }
                    }
                    short = short || trailingStop({ symbol });
                    /*   if ((m5Data.stochasticKBelowD && /!*m15Data.momentumAboveZero*!/ m5Data.momentumCrossingZeroDistance >= 1)
                                        || (m5Data.stochasticRSICrossingHighRefDistance <= -1)) {
                                        short = true
                                    }*/

                }
            }
        }
        if (process.env.MAX03) {
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
                            && m15Data.rsiCrossingHighRefDistance > 1 && h1Data.rsiTrendUp
                            && (!m15Data.priceCroissingEma10Point || m15Data.priceCroissingEma10Point > 5)
                        )
                    ) {
                        // bid = _.min([m5Data.prev.close, m5Data.last.close * (1 - Math.abs(viewTrend.trend[symbol].spread))]);
                        bid = _.min([m5Data.last.open, m5Data.last.close]);
                        long = true
                    }
                }
                {
                    if (m5Data.ema10Above20 && m5Data.ema20BelowPrice) {
                        skipShort = true
                    }
                }
            }
        }

        if (process.env.MAX05) {
            {

                {
                    if ((m5Data.rsiCrossingHighRefDistance = 1)) {
                        // bid = _.min([m5Data.prev.close, m5Data.last.close * (1 - Math.abs(viewTrend.trend[symbol].spread))]);
                        // bid = signal.open;
                        bid = _.min([m5Data.last.open, m5Data.last.close]);
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

        if (process.env.MAX02) {

            if (viewTrend.trend[symbol].pumping && m5Data.rsiAbove70) {
                bid = _.min([m5Data.last.open, m5Data.last.close]);
                bid = _.min([bid, m5Data.last.close * (1 - 1 / 100)]);
                long = true
            }
        }
        if (process.env.MAX04) {
            // if (viewTrend.trend[symbol].pumping) {
            const pumpers = viewTrend.listPumpers();
            if (symbol in pumpers) {
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
                bid && await    stopLossBuy.tryTrade({ symbol, close: signal.close, price: bid });
                bid = bid || signal.close;
                emitMessage(`${symbol} START ${bid}`);
                return appEmitter.emit('analyse:try_trade', {
                    signalData: _.extend({}, signal, { close: bid }),
                    signals
                });
            } catch (e) {

            }
        } else {
            short = !skipShort && (short || trailingStop({
                symbol,
                target: env.SELL_LIMIT_PERCENT,
                tradeMaxDuration: env.MAX_WAIT_TRADE_TIME,
                minLoss: env.STOP_LOSS_PERCENT
            }));
            stopLossBuy.cancel({ symbol })
        }

        if (short) {
            appEmitter.emit('analyse:stop_trade:' + symbol, ({ signal }))
        }
    }
}

function viewTrend({ signal }) {
    const CUSTOM_TIMEFRAME = (60 * 1e3) / 1;
    const PUMP_PERCENT = 1 / 1;
    const PIP = PUMP_PERCENT / CUSTOM_TIMEFRAME;

    const { symbol, close } = signal;
    viewTrend.trend = viewTrend.trend || {}
    const trend = viewTrend.trend[symbol] = viewTrend.trend[symbol] || { symbol }
    trend.pumping = false;
    if (!trend.started) {
        trend.started = true;
        trend.startTime = Date.now();
        trend.startPrice = close;
        trend.spread = 0;
        trend.tick = 0;
    } else {
        let change = getGain({ high: close, low: trend.startPrice });
        trend.spread = _.min([trend.spread, change - trend.change])
        if (trend.change !== change) {
            trend.change = change
            trend.maxChange = _.max([trend.change, trend.maxChange])
            trend.maxLoss = trend.maxChange - trend.change;
            trend.tick++

            trend.duration = (Date.now() - trend.startTime);
            {//version 02
                if (process.env.PUMP === 'v2') {
                    if (trend.change < 0) {
                        trend.started = false;
                    } else {
                        if (trend.change >= 5 && trend.tick > 20) {
                            trend.pumping = true;
                        }
                        if (trend.maxLoss > 2) {
                            trend.started = false;
                        }
                    }
                }
            }
            {//version 01

                if (process.env.PUMP === 'v0') {
                    if (trend.change < 0) {
                        trend.started = false;
                    } else if (trend.maxLoss > 1) {
                        trend.started = false;
                    } else if (trend.change >= PUMP_PERCENT && trend.duration < CUSTOM_TIMEFRAME) {
                        trend.pumping = true;
                    } else if (trend.change >= PUMP_PERCENT && trend.duration > CUSTOM_TIMEFRAME) {
                        let duration2 = trend.duration - CUSTOM_TIMEFRAME;
                        let change2 = trend.change - PUMP_PERCENT;
                        if (change2 > PIP * duration2) {
                            trend.pumping = true //still pumping stopped
                        } else {
                            trend.started = false;
                        }
                    } else if (trend.change < PUMP_PERCENT && trend.duration > CUSTOM_TIMEFRAME) {
                        trend.started = false;
                    }
                }
            }
        }
    }
    trend.change > 1 && emitMessage(`${symbol}  ${trend.change.toFixed(2)}% ${(trend.duration / 60e3).toFixed(2)} minutes ${trend.tick} tick ${trend.pumping ? 'pumper' : ''}`)

    function listPumpers() {

        let pumpers = _.keys(viewTrend.trend).reduce((pumpers, symbol) => {
            let trend = viewTrend.trend[symbol];
            if ((trend.pumping || trend.change > 2) && trend.tick > 20) {
                pumpers[symbol] = viewTrend.trend[symbol]
            }
            return pumpers;
        }, {});
        return pumpers;
    }

    _.defaults(viewTrend, { listPumpers });

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

    _.defaults(backupLast3Points, { getLast3Points, getLast3UniqPoints });
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
                crossingPoint = specialData.emaCrossingPoint = crossingPoint //|| specialData.emaCrossingPoint;
                specialData.emaCrossingDistance = countCandle({ crossingPoint, timeframe });

                crossingPoint = getCrossingPoint({ up: 'close', down: 'ema10', points, });
                crossingPoint = specialData.priceCroissingEma10Point = crossingPoint //|| specialData.priceCroissingEma10Point;
                specialData.priceCroissingEma10Distance = countCandle({ crossingPoint, timeframe });

                specialData.emaDistance = getGain({ high: last.ema10, low: last.ema20 });
            }
            {
                specialData.macdAboveSignal = last.macd > last.macd_signal;
                specialData.macdBelowSignal = last.macd < last.macd_signal;
                specialData.macdTrendUp = isSorted([first.macd, prev.macd, last.macd,]);
                specialData.macdTrendDown = isSorted([first.macd, prev.macd, last.macd,].reverse());
                specialData.macdSignalTrendUp = isSorted([first.macd_signal, prev.macd_signal, last.macd_signal,]);

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
                    specialData.diPlusTrendUp = isSorted([first.adx_plus_di, prev.adx_plus_di, last.adx_plus_di,]);
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
                    specialData.adxTrendUp = isSorted([first.adx, prev.adx, last.adx,]);
                    specialData.adxEcart = _.min([last.adx - prev.adx, prev.adx - first.adx]);

                    let crossingPoint = getCrossingPoint({ up: 'adx', down: 'adx_ref', points });
                    crossingPoint = specialData.adxCrossingPoint = crossingPoint //|| specialData.adxCrossingPoint;
                    specialData.adxCrossingDistance = countCandle({ crossingPoint, timeframe });

                }
            }
            {
                const RSi_HIGH_REF = 70;
                const POINT_60 = 60;
                first.rsiHighRef = prev.rsiHighRef = last.rsiHighRef = RSi_HIGH_REF;
                first.point60 = prev.point60 = last.point60 = POINT_60;

                specialData.rsiAbove70 = last.rsi >= 70;
                specialData.rsiBelow30 = last.rsi <= 30;

                specialData.maxRsi = last.rsi < 70 ? null : _.max([last.rsi, specialData.maxRsi]);
                let crossingPoint = getCrossingPoint({ up: 'rsi', down: 'point60', points });
                crossingPoint = specialData.rsiCrossing60Point = crossingPoint //|| specialData.rsiCrossing60Point;
                specialData.rsiCrossing60Distance = countCandle({ crossingPoint, timeframe });

                crossingPoint = getCrossingPoint({ up: 'rsi', down: 'rsiHighRef', points });
                crossingPoint = specialData.rsiCrossingHighRefPoint = crossingPoint //|| specialData.rsiCrossingHighRefPoint;
                specialData.rsiCrossingHighRefDistance = countCandle({ crossingPoint, timeframe });

                specialData.rsiEstAGauche = (specialData.rsiCrossing60Distance > 0 && last.rsi <= 70
                    && (!specialData.rsiCrossingHighRefDistance || specialData.rsiCrossingHighRefDistance > 0)
                ) || (last.rsi > 70 && last.rsi === specialData.maxRsi);

                specialData.rsiTrendUp = isSorted([first.rsiTrendUp, prev.rsiTrendUp, last.rsiTrendUp,]);

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
                    specialData.stochasticRSIKTrendUp = isSorted([first.stochasticRSIK, prev.stochasticRSIK, last.stochasticRSIK,]);
                    specialData.stochasticRSIDTrendUp = isSorted([first.stochasticRSID, prev.stochasticRSID, last.stochasticRSID,]);

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
                specialData.momentumTrendUp = prev.momentum < last.momentum
                specialData.momentumTrendDown = prev.momentum > last.momentum
                let crossingPoint = getCrossingPoint({ up: 'momentum', down: 'momentumMedian', points });
                crossingPoint = specialData.momentumCrossingZeroPoint = crossingPoint //|| specialData.momentumCrossingPoint;
                specialData.momentumCrossingZeroDistance = countCandle({ crossingPoint, timeframe });

            }
            {
                //DEBUG
                let {
                    ema10Above20, emaDistance, emaCrossingPoint, ema10TrendUp, ema20TrendUp, emaCrossingDistance,
                    macdCrossingPoint, macdAboveSignal, macdAboveZero, macdSignalAboveZero, macdSignalTrendUp, macdTrendUp, macdCrossingDistance,
                    diCrossingPoint, diCrossingDistance, diDistance, diMinusBelowAdxRef, diMinusTrendDown, diPlusAboveAdxRef, diPlusAboveMinus, diPlusTrendUp,
                    adxAboveRef, adxTrendUp, absenceDePique, adxEcart, adxValue, adxCrossingPoint, adxCrossingDistance,
                    rsiEstAGauche, rsiCrossing60Distance
                } = specialData;
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
                // if (rsiEstAGauche) {
                //     emitMessage(`${symbol} ${timeframe} rsiEstAGauche ${rsiCrossing60Distance}`)
                // }
            }

        }

    }


    function init() {
        buildStrategy.specialData = buildStrategy.specialData || {};
        buildStrategy.specialData[symbol] = buildStrategy.specialData[symbol] || {};
    }

    function getSpecialData({ symbol, timeframe }) {
        return buildStrategy.specialData[symbol][timeframe] = buildStrategy.specialData[symbol][timeframe] || {
            symbol,
            timeframe
        };
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
