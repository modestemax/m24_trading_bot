const debug = require('debug')('analyse');
const _ = require('lodash');
const isSorted = require('is-sorted');
const Promise = require('bluebird');
const { getSignalResult } = require('../analyse/analyser');
let { settingsByIndicators: indicatorSettings } = require('./indicators');

const trade = require('../trade');
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


function checkTrend({ symbol }) {
    let trendUp = checkTrend.trendUp = checkTrend.trendUp = {};
    // if (signal && signal.timeframe == TIMEFRAME) {
    // let { symbol, timeframe } = signal;
    let s5 = signals[5][symbol] || {};
    let s15 = signals[15][symbol] || {};
    let s60 = signals[60][symbol] || {};
    let s240 = signals[240][symbol] || {};
    let sday = signals[60 * 24][symbol];
    // let s;
    // switch (timeframe) {
    //     case 5: {
    //         s = s5;
    //         let [prevCh, lastCh] = s.indicators.change_from_open.slice(-2);
    //         if (prevCh < 0 && lastCh < .1) return;
    //         if (lastCh < .05) return;
    //         let ema10 = _.last(s.indicators.ema10);
    //         let ema20 = _.last(s.indicators.ema20);
    //         if (((ema10 - ema20) / Math.abs(ema20) * 100) < .2) return;
    //
    //         if (s5.rating > .5 && s15.rating > .5 && s60.rating > 0 && s240.rating > 0 && sday.rating > 0) {
    //             // return true;
    //         }
    //         break;
    //     }
    //     case 240: {
    // s = s240;

    if (s5.rating > 0 && s15.rating > 0 && s60.rating > 0 && s240.rating > 0 && sday.rating > 0) {
        if (s5.changePercent >= 0 && s15.changePercent >= 0 && s60.changePercent >= 0 && s240.changePercent >= 0 && sday.changePercent >= 0) {
            if (s5.changeFromOpen >= 0 && s15.changeFromOpen >= 0 && s60.changeFromOpen >= 0 && s240.changeFromOpen >= 0 && sday.changeFromOpen >= 0) {
                if (s5.ema10 > s5.ema20 && s15.ema10 > s15.ema20 && s60.ema10 > s60.ema20 && s240.ema10 > s240.ema20 && sday.ema10 > sday.ema20) {
                    return trendUp[symbol] = true;
                }
            }
        }
    }
    delete trendUp[symbol];
    //     break;
    // }
    // case 15:
    //     s = s15;
    //     break;
// }

// }
}

//
// function accumulateSignalResult({ signal }) {
//     let { symbol, timeframe } = signal;
//     buyTimeframes[symbol] = buyTimeframes[symbol] || {};
//     buyTimeframes[symbol] [timeframe] = _.extend({ buyTimes: 0 }, buyTimeframes[symbol] [timeframe], signal);
// }


async function checkSignal({ signal }) {
    let { symbol } = signal;
    // accumulateSignalResult({ signal });


    // suivreLaTendanceAvantDacheter({ signal });
    backupLast3Points({ signal: signals[5][symbol] });
    checkTrend({ symbol });
    suivreLaTendanceAvantDacheter({ signal: signals[5][symbol] });

}


function getGain(close, price) {
    return (close - price) / Math.abs(price) * 100;
}

function suivreLaTendanceAvantDacheter({ signal, } = {}) {
    let checks = suivreLaTendanceAvantDacheter.checks = suivreLaTendanceAvantDacheter.checks || {};

    if (signal) {
        let { symbol } = signal;
        if (checkTrend.trendUp[symbol]) {
            if (!checks[symbol]) {
                checks[symbol] = {
                    price: signal.close,
                    gain: 0,
                    lost: 0,
                    time0: Date.now(),
                    time: Date.now(),
                    changeStep: 0
                }
            } else {
                let market = checks[symbol];
                let { price, gain: oldGain, lost, time, changeStep, } = market;
                let { close } = signal;
                let gain = getGain(close, price);
                if (gain === oldGain) return;
                debug(symbol, 'gain', gain, 'step', changeStep);
                if (gain < 0) {
                    lost += gain;
                    if (lost < -1) {
                        if (changeStep) {
                           // debugger
                            //juste pour voir le ratio fr ce qui commence a monter puis echoue
                        }
                        return delete checks[symbol];
                    }
                    return _.extend(market, { price: close, lost, gain, time: Date.now(), changeStep: 0 })
                }
                let duration = Date.now() - time;
                //on doit avoir fait 1% en minimum 30 secondes et en 5 changement de prix aumoins
                if (gain >= .3 && duration > 30e3 && changeStep >= 100) {
                    if (specialCheck({ symbol })) {
                        delete checks[symbol];
                        if (estFiable({ symbol })) {
                            console.log('buying', symbol);
                            return appEmitter.emit('analyse:try_trade', { signalData: signal, signals });
                        }
                    }
                }
                return _.extend(market, { gain, changeStep: ++changeStep })

            }
        } else {
            delete checks[signal.symbol]
        }
    }
}

function backupLast3Points({ signal }) {
    let tendances = backupLast3Points.tendances = backupLast3Points.tendances || {};
    if (signal) {
        let { symbol } = signal
        let tendance = tendances[symbol] = tendances[symbol] || [];
        let [first, prev, last] = tendance;
        if (!last) {
            tendance.push(signal)
        } else if (first.id === prev.id) {
            tendance.shift();
            tendance.push(signal);
        } else if (prev.id === last.id) {
            tendance.splice(1, 1);
            tendance.push(signal);
        } else if (last.id !== signal.id) {
            tendance.shift();
            tendance.push(signal);
        } else {
            tendance.splice(2, 1, signal)
        }
    }
}


function specialCheck({ symbol }) {
    let [first, prev, last] = backupLast3Points.tendances[symbol];
    if (!(first && prev && last)) return;

    const points = [first, prev, last];
    specialCheck.ema10Above20 = last.ema10 > last.ema20;
    specialCheck.ema10TrendUp = isSorted([first.ema10, prev.ema10, last.ema10,]);
    specialCheck.ema20TrendUp = isSorted([first.ema20, prev.ema20, last.ema20,]);
    specialCheck.emaCrossingUpAt = getCrossingUpPoint({ up: 'ema10', down: 'ema20', points });
    specialCheck.emaCrossingDistance = specialCheck.emaCrossingUpAt && ((Date.now() / 5 * 60e3) - specialCheck.emaCrossingUpAt.id);
    specialCheck.emaDistance = getGain(last.ema10, last.ema20)

    specialCheck.macdAboveSignal = last.macd > last.macd_signal;
    specialCheck.macdTrendUp = isSorted([first.macd, prev.macd, last.macd,]);
    specialCheck.macdSignalTrendUp = isSorted([first.macd_signal, prev.macd_signal, last.macd_signal,]);
    specialCheck.macdCrossingUpAt = getCrossingUpPoint({ up: 'macd', down: 'macd_signal', points });
    specialCheck.macdAboveZero = last.macd > 0
    specialCheck.macdSignalAboveZero = last.macd_signal > 0

    const ADX_REF = 20;
    specialCheck.diPlusAboveMinus = last.adx_plus_di > last.adx_minus_di;
    specialCheck.diPlusTrendUp = isSorted([first.adx_plus_di, prev.adx_plus_di, last.adx_plus_di,]);
    specialCheck.diMinusTrendDown = isSorted([first.adx_minus_di, prev.adx_minus_di, last.adx_minus_di,].reverse());
    specialCheck.diCrossingUpAt = getCrossingUpPoint({ up: 'adx_plus_di', down: 'macd_signal', points });
    specialCheck.diPlusAboveAdxRef = last.adx_plus_di > ADX_REF
    specialCheck.diMinusBelowAdxRef = last.adx_minus_di < ADX_REF
    specialCheck.diDistance = last.adx_plus_di - last.adx_minus_di;

    specialCheck.adxAboveRef = last.adx > ADX_REF
    specialCheck.adxTrendUp = isSorted([first.adx, prev.adx, last.adx,]);
    specialCheck.adxEcart = _.min([last.adx - prev.adx, prev.adx - first.adx]);

    specialCheck.absenceDePique = 0 <= last.changeFromOpen && last.changeFromOpen < .2 && prev.changeFromOpen < .5 && first.changeFromOpen < .75;

    let {
        ema10Above20, emaDistance, emaCrossingUpAt, ema10TrendUp, ema20TrendUp, emaCrossingDistance,
        macdCrossingUpAt, macdAboveSignal, macdAboveZero, macdSignalAboveZero, macdSignalTrendUp, macdTrendUp, macdCrossingDistance,
        diCrossingUpAt, diDistance, diMinusBelowAdxRef, diMinusTrendDown, diPlusAboveAdxRef, diPlusAboveMinus, diPlusTrendUp,
        adxAboveRef, adxTrendUp, absenceDePique, adxEcart
    } = specialCheck;

    if (ema10Above20 && emaDistance >= .2 && ema10TrendUp && ema20TrendUp /*&& emaCrossingDistance < 3*/) {
        if (macdAboveSignal && macdAboveZero && macdSignalAboveZero && macdTrendUp && macdSignalTrendUp) {
            if (diPlusAboveMinus && diDistance >= 5 && (diPlusTrendUp || diMinusTrendDown) && diPlusAboveAdxRef && diMinusBelowAdxRef) {
                if (adxAboveRef && adxTrendUp && adxEcart >= 1) {
                    if (absenceDePique) {
                        return true;
                    }
                }
            }
        }
    }
}

function getCrossingStatus({ up, down }) {
    let [upPrev, upCurr] = up.slice(-2);
    let [downPrev, downCurr] = down.slice(-2);
    let crossing_up = upPrev <= downPrev && upCurr > downCurr;
    let crossing_down = upPrev >= downPrev && upCurr < downCurr;
    return (crossing_up || crossing_down) && { crossing_up, crossing_down };
}

function getCrossingPoint({ up, down, points }) {
    if (points.length < 2) {
        if (points.length === 2) {
            let [pt0, pt1] = points;
            let status = getCrossingStatus({ up: [pt0[up], pt1[up]], down: [pt0[down], pt1[down]], });
            if (status) {
                return Object.assign(status, { point: pt1 });
            }
        } else {
            if (getCrossingPoint({ up, down, points: points.slice(-1) })) {
                return _.last(points);
            } else {
                return getCrossingPoint({ up, down, points: _.initial(points) })
            }
        }
    }
    return null;
}

function getCrossingUpPoint({ up, down, points }) {
    let position = getCrossingPoint({ up, down, points })
    if (position && position.crossing_up) {
        return position.point
    }
}

function estFiable({ symbol }) {
    let closed = _.first(_.orderBy(_.filter(trade.closedTrades, { symbol: symbol }), 'time', 'desc'));
    if (closed && Date.now() - closed.time < 60e3) {
        return closed.success
    } else {
        return true;
    }
}

listenToEvents();
