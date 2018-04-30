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
                    return true;
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


function suivreLaTendanceAvantDacheter({ signal, trySymbol = false } = {}) {
    let tendances = suivreLaTendanceAvantDacheter.tendances = suivreLaTendanceAvantDacheter.tendances || {};

    if (signal && signal.timeframe == TIMEFRAME) {
        let { symbol } = signal;
        if (trySymbol && !tendances[signal.symbol]) {
            tendances[symbol] = { price: signal.close, lost: 0 }
        } else if (tendances[signal.symbol]) {
            let market = tendances[symbol];
            let { price, lost } = market;
            let { close } = signal;
            let gain = (close - price) / price * 100;
            if (!gain) return;
            if (gain < 0) {
                lost += gain;
                if (lost < -1) {
                    return delete tendances[symbol];
                }
                return _.extend(market, { price: close, lost })
            }

            if (gain >= 2 && signal.rating > 0) {
                delete tendances[symbol];
                appEmitter.emit('analyse:try_trade', { signalData: signal, signals });
            }
        }
    }
}

listenToEvents();
