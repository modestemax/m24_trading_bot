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
    return trendUp[symbol] = true;
    // if (s5.rating > 0 && s15.rating > 0 && s60.rating > 0 && s240.rating > 0 && sday.rating > 0) {
    if (s5 && s15 && s60 && s240 && sday) {
        if (s5.changePercent >= 0 && s15.changePercent >= 0 && s60.changePercent >= 0 && s240.changePercent >= 0 && sday.changePercent >= 0) {
            if (s5.changeFromOpen >= 0 && s15.changeFromOpen >= 0 && s60.changeFromOpen >= 0 && s240.changeFromOpen >= 0 && sday.changeFromOpen >= 0) {

                if (s5.ema10 > s5.ema20 && s15.ema10 > s15.ema20 && s60.ema10 > s60.ema20 && s240.ema10 > s240.ema20 && sday.ema10 > sday.ema20) {
                    if (s5.macd > s5.macd_signal && s15.macd > s15.macd_signal && s60.macd > s60.macd_signal && s240.macd > s240.macd_signal && sday.macd > sday.macd_signal) {
                        if (s5.adx_plus_di > s5.adx_minus_di && s15.adx_plus_di > s15.adx_minus_di && s60.adx_plus_di > s60.adx_minus_di && s240.adx_plus_di > s240.adx_minus_di && sday.adx_plus_di > sday.adx_minus_di) {
                            return trendUp[symbol] = true;
                        }
                    }
                }
            }
        }
    }
    // }
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
    backupLast3Points({ symbol, });
    checkTrend({ symbol });
    suivreLaTendanceAvantDacheter({ symbol });

}


function getGain({ high, low }) {
    return (high - low) / Math.abs(low) * 100;
}

function suivreLaTendanceAvantDacheter({ symbol, } = {}) {
    let checks = suivreLaTendanceAvantDacheter.checks = suivreLaTendanceAvantDacheter.checks || {};
    let signal = signals[TIMEFRAME][symbol];
    let signal5 = signals[5][symbol];

    if (signal) {
        let { symbol } = signal;
        // if (checkTrend.trendUp[symbol]) {
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
            let gain = getGain({ high: close, low: price });
            if (gain === oldGain) return;
            // debug(symbol, 'gain', gain, 'step', changeStep);
            if (gain < 0) {
                lost += gain;
                if (lost < -2) {
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

            // if (lost < -1 || (.3 < gain /* && duration > 30e3*/ && -0.2 < lost /*changeStep >= 100*/)) {
            // emitMessage(`${symbol}  special check, changeStep:${changeStep}, duration: ${duration}  lost: ${lost} gain: ${gain}`);
            if (specialCheck({ symbol, market })) {
                // delete checks[symbol];
                // if (estFiable({ symbol })) {

                // emitMessage(`${symbol} , changeStep:${changeStep}, duration: ${duration} lost: ${lost} gain: ${gain}`);
                // emitMessage(symbol + ' buying');
                // return appEmitter.emit('analyse:try_trade', { signalData: signal, signals });
                // }
            }
            // }
            return _.extend(market, { gain, changeStep: ++changeStep })

        }
        // } else {
        //     delete checks[signal.symbol]
        // }
    }
}

function backupLast3Points({ symbol, timeframes = [5, 15, 60] }) {
    backupLast3Points.tendances = backupLast3Points.tendances || {};
    backupLast3Points.tendances[symbol] = backupLast3Points.tendances[symbol] || {};

    _.forEach(timeframes, savePoints);

    function savePoints(timeframe) {


        let points = backupLast3Points.tendances [symbol] [timeframe] = backupLast3Points.tendances [symbol] [timeframe] || [];

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
            } else if (last.id !== signal.id) {
                points.shift();
                points.push(signal);
            } else {
                points.splice(2, 1, signal)
            }
        }
    }
}


function specialCheck({ symbol, timeframes = [5, 15, 60] }) {
    specialCheck.specialData = specialCheck.specialData || {};
    specialCheck.specialData[symbol] = specialCheck.specialData[symbol] || {};

    _.forEach(timeframes, getSpecialData);

    function getSpecialData(timeframe) {
        const tendances = backupLast3Points.tendances[symbol];
        let specialData = specialCheck.specialData[symbol][timeframe] = specialCheck.specialData[symbol][timeframe] || {};


        const points = tendances[timeframe];
        if (_.compact(points).length !== 3 || _.uniqBy(points, 'id').length < 2) return;

        const [first, prev, last] = points;

        specialData.ema10Above20 = last.ema10 > last.ema20;
        specialData.ema10TrendUp = isSorted([first.ema10, prev.ema10, last.ema10,]);
        specialData.ema20TrendUp = isSorted([first.ema20, prev.ema20, last.ema20,]);
        // le point de croisement change uniquement au prochain croisement,
        //     si pas croisement le point precedent est maintenu
        // le point de croisement doit etre pris en monté coe en descente
        //
        // si ecart tres petit alors considerer croisement

        specialData.emaCrossingAt =
            getCrossingPoint({ up: 'ema10', down: 'ema20', points, zero: .06 }) || specialData.emaCrossingAt;
        specialData.emaCrossingDistance = specialData.emaCrossingAt && countCandle({
            id: specialData.emaCrossingAt.point.id,
            timeframe
        });
        specialData.emaDistance = getGain({ high: last.ema10, low: last.ema20 })

        specialData.macdAboveSignal = last.macd > last.macd_signal;
        specialData.macdTrendUp = isSorted([first.macd, prev.macd, last.macd,]);
        specialData.macdSignalTrendUp = isSorted([first.macd_signal, prev.macd_signal, last.macd_signal,]);
        specialData.macdCrossingAt =
            getCrossingPoint({ up: 'macd', down: 'macd_signal', points }) || specialData.macdCrossingAt;
        specialData.macdCrossingDistance = specialData.macdCrossingAt && countCandle({
            id: specialData.macdCrossingAt.point.id,
            timeframe
        });
        specialData.macdAboveZero = last.macd > 0
        specialData.macdSignalAboveZero = last.macd_signal > 0

        const ADX_REF = 25;
        specialData.diPlusAboveMinus = last.adx_plus_di > last.adx_minus_di;
        specialData.diPlusTrendUp = isSorted([first.adx_plus_di, prev.adx_plus_di, last.adx_plus_di,]);
        specialData.diMinusTrendDown = isSorted([first.adx_minus_di, prev.adx_minus_di, last.adx_minus_di,].reverse());
        specialData.diCrossingAt =
            getCrossingPoint({ up: 'adx_plus_di', down: 'macd_signal', points }) || specialData.diCrossingAt;
        specialData.diCrossingDistance = specialData.diCrossingAt && countCandle({
            id: specialData.diCrossingAt.point.id,
            timeframe
        });
        specialData.diPlusAboveAdxRef = last.adx_plus_di > ADX_REF
        specialData.diMinusBelowAdxRef = last.adx_minus_di < ADX_REF
        specialData.diDistance = last.adx_plus_di - last.adx_minus_di;

        specialData.adxValue = last.adx
        specialData.adxAboveRef = last.adx > ADX_REF
        specialData.adxTrendUp = isSorted([first.adx, prev.adx, last.adx,]);
        specialData.adxEcart = _.min([last.adx - prev.adx, prev.adx - first.adx]);
        first.adx_ref = prev.adx_ref = last.adx_ref = ADX_REF;
        specialData.adxCrossingAt = getCrossingPoint({ up: 'adx', down: 'adx_ref', points }) || specialData.adxCrossingAt;
        specialData.adxCrossingDistance = specialData.adxCrossingAt && countCandle({
            id: specialData.adxCrossingAt.point.id,
            timeframe
        });
        // specialCheck.absenceDePique = 0 <= last.changeFromOpen && last.changeFromOpen < .2 && prev.changeFromOpen < .5 && first.changeFromOpen < .75;

        let {
            ema10Above20, emaDistance, emaCrossingAt, ema10TrendUp, ema20TrendUp, emaCrossingDistance,
            macdCrossingAt, macdAboveSignal, macdAboveZero, macdSignalAboveZero, macdSignalTrendUp, macdTrendUp, macdCrossingDistance,
            diCrossingAt, diCrossingDistance, diDistance, diMinusBelowAdxRef, diMinusTrendDown, diPlusAboveAdxRef, diPlusAboveMinus, diPlusTrendUp,
            adxAboveRef, adxTrendUp, absenceDePique, adxEcart, adxValue, adxCrossingAt, adxCrossingDistance
        } = specialData;

        if (emaCrossingAt) {
            emitMessage(`${symbol} ${timeframe} ema crossing ${emaCrossingAt.crossing_up ? 'Up' : 'Down'} [${emaCrossingAt.point.ema10},${emaCrossingAt.point.ema20}] distance: ${emaCrossingDistance}`)
        }
        if (macdCrossingAt) {
            emitMessage(`${symbol} ${timeframe} macd crossing ${macdCrossingAt.crossing_up ? 'Up' : 'Down'} [${macdCrossingAt.point.macd},${macdCrossingAt.point.macd_signal}] distance: ${macdCrossingDistance}`)

        }
        if (diCrossingAt) {
            emitMessage(`${symbol} ${timeframe} DI crossing ${diCrossingAt.crossing_up ? 'Up' : 'Down'} [${diCrossingAt.point.adx_plus_di},${diCrossingAt.point.adx_minus_di}] distance: ${diCrossingDistance}`)
        }
        if (adxCrossingAt) {
            emitMessage(`${symbol} ${timeframe} ADX crossing ${adxCrossingAt.crossing_up ? 'Up' : 'Down'} [${adxValue}] distance: ${adxCrossingDistance}`)
        }

        // if (process.env.TRADE_ON_EMA_CROSS) {
        //     //  si du signal sentinel au croisement on a fait bcp on peut anticiper l'entrer a la position 0 ou 1
        //     return .2 <= emaDistance && 1 <= emaCrossingDistance && emaCrossingDistance <= 3;
        // }
        // if (ema10Above20 && emaDistance >= .2 && ema10TrendUp && ema20TrendUp /*&& emaCrossingDistance < 3*/) {
        //     if (macdAboveSignal && macdAboveZero && macdSignalAboveZero && macdTrendUp && macdSignalTrendUp) {
        //         if (diPlusAboveMinus && diDistance >= 5 && (diPlusTrendUp && diMinusTrendDown) && diPlusAboveAdxRef && diMinusBelowAdxRef) {
        //             if (adxAboveRef) {
        //                 if (adxValue > 30 || (adxTrendUp && adxEcart > .5)) {
        //                     // if (absenceDePique) {
        //                     emitMessage(symbol + ' status -> ' + JSON.stringify(Object.assign({}, specialCheck)))
        //                     return true;
        //                     // }
        //                 }
        //             }
        //         }
        //     }
        // }


    }
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


function countCandle({ id, timeframe }) {
    return Math.trunc((Date.now() / (timeframe * 60e3))) - id
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
