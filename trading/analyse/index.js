const debug = require('debug')('analyse');
const _ = require('lodash');
const Promise = require('bluebird');
const { getSignalResult } = require('../analyse/analyser');
let { settingsByIndicators: indicatorSettings } = require('./indicators');

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
                        checkSignal({ signal });
                    }
                });
            })
        } finally {
            analyse.running = false;
        }
    }
}


function tryBuy({ signal }) {
    if (signal && signal.timeframe == TIMEFRAME) {
        let { symbol, timeframe } = signal;
        let s5 = signals[5][symbol] || {};
        let s15 = signals[15][symbol] || {};
        let s60 = signals[60][symbol] || {};
        let s240 = signals[240][symbol] || {};
        let sday = signals[60 * 24][symbol];
        let s;
        switch (timeframe) {
            case 5: {
                s = s5;
                let [prevCh, lastCh] = s.indicators.change_from_open.slice(-2);
                if (prevCh < 0 && lastCh < .1) return;
                if (lastCh < .05) return;
                let ema10 = _.last(s.indicators.ema10);
                let ema20 = _.last(s.indicators.ema20);
                if (((ema10 - ema20) / Math.abs(ema20) * 100) < .2) return;

                if (s5.rating > .5 && s15.rating > .5 && s60.rating > 0 && s240.rating > 0 && sday.rating > 0) {
                    // return true;
                }
                break;
            }
            case 240: {
                s = s240;

                if (s5.rating > 0 && s15.rating > 0 && s60.rating > 0 && s240.rating > 0 && sday.rating > 0) {
                    if (s5.changePercent > 0 && s15.changePercent > 0 && s60.changePercent > 0 && s240.changePercent > 0 && sday.changePercent > 0) {
                        if (s5.changeFromOpen > 0 && s15.changeFromOpen > 0 && s60.changeFromOpen > 0 && s240.changeFromOpen > 0 && sday.changeFromOpen > 0) {
                            if (s5.ema10 > s5.ema20 && s15.ema10 > s15.ema20 && s60.ema10 > s60.ema20 && s240.ema10 > s240.ema20 && sday.ema10 > sday.ema20) {
                                return true;
                            }
                        }
                    }
                }
                break;
            }
            case 15:
                s = s15;
                break;
        }
    }
}

//
// function accumulateSignalResult({ signal }) {
//     let { symbol, timeframe } = signal;
//     buyTimeframes[symbol] = buyTimeframes[symbol] || {};
//     buyTimeframes[symbol] [timeframe] = _.extend({ buyTimes: 0 }, buyTimeframes[symbol] [timeframe], signal);
// }


async function checkSignal({ signal }) {

    // accumulateSignalResult({ signal });

    suivreLaTendanceAvantDacheter({ signal });

    if (tryBuy({ signal })) {
        suivreLaTendanceAvantDacheter({ signal, trySymbol: true });
    }
}


function getGain(close, price) {
    return (close - price) / Math.abs(price) * 100;
}

function suivreLaTendanceAvantDacheter({ signal, trySymbol = false } = {}) {
    let checks = suivreLaTendanceAvantDacheter.checks = suivreLaTendanceAvantDacheter.checks || {};

    if (signal && signal.timeframe == TIMEFRAME) {
        let { symbol, timeframe } = signal;
        if (trySymbol && !checks[signal.symbol]) {
            checks[symbol] = { price: signal.close, lost: 0 }
        } else if (checks[signal.symbol]) {
            let market = checks[symbol];
            let { price, lost } = market;
            let { close } = signal;
            let gain = getGain(close, price);
            if (!gain) return;
            if (gain < 0) {
                lost += gain;
                if (lost < -1) {
                    return delete checks[symbol];
                }
                return _.extend(market, { price: close, lost })
            }

            if (gain >= 1 && tryBuy({ signal })) {
                if (specialCheck({ symbol })) {
                    delete checks[symbol];
                    appEmitter.emit('analyse:try_trade', { signalData: signal, signals });
                }
            }
        }
    } else {
        backupTendances({ signal });
    }
}

function backupTendances({ signal }) {
    let tendances = backupTendances.tendances = backupTendances.tendances || {};
    let { timeframe, symbol } = signal
    if (timeframe == 5) {
        let tendance = tendances[symbol] = tendances[symbol] || [];
        let [prev, last] = tendances;
        if (!last) {
            tendance.push(signal)
        } else if (last.id === prev.id) {
            tendance.shift();
            tendance.push(signal);
        } else if (last.id !== signal.id) {
            tendance.shift();
            tendance.push(signal);
        } else if (last.id === signal.id) {
            tendance.splice(1, 1, signal)
        }
    }
}


function specialCheck({ symbol }) {
    let cross, [prev, last] = backupTendances.tendances[symbol];

    _.extend(specialCheck, {
        // emaCrossingUpAt,
        emaDistance: null,
        // macdCrossingUpAt,
        macdPositif: null,
        // diCrossingUpAt,
        diMinusTrendingDown: null,
        diPlusTrendingUp: null,
        adxAboveReference: null,
        // adxCrossingUpAt,
        adxTrendingUp: null
    })

    cross = isCrossing({ up: [prev.ema10, last.ema10], down: [prev.ema20, last.ema20] })


    if (cross) {
        if (cross.crossing_up) {
            specialCheck.emaCrossingUpAt = last.id
        } else {
            specialCheck.emaCrossingUpAt = null;
        }
    }
    specialCheck.emaDistance = getGain(last.ema10, last.ema20)


    if (isCrossing({ up: [prev.macd, last.macd], down: [prev.macd_signal, last.macd_signal] })) {
        specialCheck.macdCrossingUpAt = last.id
        specialCheck.macdPositif = last.macd > 0;
    }
    if (isCrossing({ up: [prev.adx_plus_di, last.adx_plus_di], down: [prev.adx_minus_di, last.adx_minus_di] })) {
        specialCheck.diCrossingUpAt = last.id
        specialCheck.diPlusTrendingUp = prev.adx_plus_di < last.adx_plus_di
        specialCheck.diMinusTrendingDown = prev.adx_minus_di > last.adx_minus_di
        specialCheck.diMinusUnderReference = prev.adx_minus_di < 20
    }
    if (isCrossing({ up: [prev.adx, last.adx], down: [20, 20] })) {
        specialCheck.adxCrossingUpAt = last.id
        specialCheck.adxAboveReference = last.adx > 20
        specialCheck.adxTrendingUp = prev.adx < last.adx
    }

    let {
        emaCrossingUpAt, emaDistance, macdCrossingUpAt, macdPositif, diCrossingUpAt, diMinusTrendingDown,
        diPlusTrendingUp, adxAboveReference, adxCrossingUpAt, adxTrendingUp
    } = specialCheck;

    if (emaDistance > .2 && last.id - emaCrossingUpAt <= 2) {
        if (macdPositif && macdCrossingUpAt < 5) {
            if (macdPositif && macdCrossingUpAt < 5) {
            }
        }
    }
}

function isCrossing({ up, down }) {
    let [upPrev, upCurr] = up.slice(-2);
    let [downPrev, downCurr] = down.slice(-2);
    let crossing_up = upPrev <= downPrev && upCurr > downCurr;
    let crossing_down = upPrev >= downPrev && upCurr < downCurr;
    return (crossing_up || crossing_down) && { crossing_up, crossing_down };
}

listenToEvents();
