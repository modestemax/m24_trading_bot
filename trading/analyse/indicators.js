const _ = require('lodash');
const sorted = require('is-sorted')
const { getChangePercent, updatePrice } = require('../utils')();


function reset(array, minCount) {
    array.splice(0, array.length - minCount)
}

function isCrossing({ upSignals, downSignals }) {
    let [upPrev, upCurr] = upSignals.slice(-2);
    let [downPrev, downCurr] = downSignals.slice(-2);
    let crossing_up = upPrev <= downPrev && upCurr > downCurr;
    let crossing_down = upPrev >= downPrev && upCurr < downCurr;
    return (crossing_up || crossing_down) && { crossing_up, crossing_down };
}

const minCount = process.env.MIN_COUNT || 2;

function getCrossingData({ upSignals, downSignals, crossingPosition = 0 }) {
    if (_.min([upSignals.length, downSignals.length]) - crossingPosition > 1) {

        let crossing = crossingPosition ?
            isCrossing({
                upSignals: upSignals.slice(0, -crossingPosition),
                downSignals: downSignals.slice(0, -crossingPosition)
            }) :
            isCrossing({ upSignals, downSignals });

        if (crossing) {
            let crossingChangePercent = distance(_.last(upSignals), upSignals[upSignals.length - (crossingPosition + 1)]);
            return _.extend({ crossingPosition, crossingChangePercent }, crossing);
        } else {
            return getCrossingData({ upSignals, downSignals, crossingPosition: 1 + crossingPosition })
        }
    }
}

function cleanUpOldSignals({ signals, crossingData }) {
    crossingData && _.forEach(signals, values => {
        values.splice(0, values.length - (crossingData.crossingPosition + 5))
    })
}

module.exports = {
    settings: [
        {
            indicator: '24H_TREND', check: false, weight: 1, mandatory: true, options: { minChangePercent: 2 }
        },
        {
            indicator: 'LONG_TREND', check: false, weight: 1, bonus: false, mandatory: true,
            options: { minChangePercent: 0.1 }
        },
        {
            indicator: 'CANDLE_COLOR', check: true, weight: 1, mandatory: true, options: { minChangePercent: .05 }
        },
        {
            indicator: 'BID_ASK_VOLUME', check: false, weight: 1, mandatory: false,
        },
        {
            indicator: 'EMA', check: true, weight: 1, mandatory: true, options: { minDistance: .1, minCount: minCount }
        },
        {
            indicator: 'MACD',
            check: true,
            weight: 1,
            mandatory: false,
            options: { minDistance: .1, minCount: minCount }
        },
        {
            indicator: 'AROON', check: false, weight: 1, mandatory: false,
            options: { minDistance: .2, upReference: 70, downReference: 30, minCount: 1 }
        },
        {
            indicator: 'ADX', check: true, weight: 1, mandatory: true,
            options: {
                buyReference: 20, minDIDistance: 5, minCount: minCount,
                minCountTimeframe: { x5: _.max([3, minCount]) }
            }
        },
        {
            indicator: 'VWMA', check: true, weight: 1, mandatory: false,
        },
        {
            indicator: 'RSI', check: false, weight: 1, mandatory: false, options: { buyReference: 30 }
        },
    ],
    get settingsByIndicators() {
        return _.reduce(this.settings, (byInd, setting) => (byInd[setting.indicator] = setting, byInd), {});
    },
    get mandatoryIndicators() {
        return _
            .filter(this.settings, s => s.mandatory)
            .filter(s => s.check)
            .map(s => s.indicator)
    },
    checkers: {
        CANDLE_COLOR({ weight, signal, options }) {
            let ok = signal.candleColor > options.minChangePercent;
            return +ok && weight
        },
        LONG_TREND({ weight, longSignal, options }) {
            let ok = Boolean(longSignal) && (longSignal.changePercent >= options.minChangePercent);
            return +ok && weight
        },
        '24H_TREND'({ weight, signal24h, options }) {
            // let ok = Boolean(signal24h) && (signal24h.changePercent >= options.minChangePercent);
            // let ok = Boolean(signal24h) && (signal24h.percentage >= options.minChangePercent);
            // let ok = Boolean(signal24h) && (signal24h.percentage >= signal24h.meanPercentage);
            // return +ok && weight;
        },

        BID_ASK_VOLUME({ weight, depth, options }) {
            let ok = Boolean(depth) && (depth.allBid > depth.allAsk);
            return +ok && weight;
        },

        EMA({ weight, signal, options }) {
            let { indicators } = signal;
            let crossingData, { ema10, ema20 } = indicators;

            indicators.EMA = _.last(ema10) > _.last(ema20);

            indicators.emaData = _.extend({
                distance: distance(_.last(ema10), _.last(ema20))
            }, crossingData = getCrossingData({ upSignals: ema10, downSignals: ema20 }));
            cleanUpOldSignals({ signals: [ema20, ema10], crossingData });


            return +indicators.EMA && weight;
            // if (0 < crossingPosition && crossingPosition <= 2 && penteCroisement >= .3) {
            //     return weight;
            // } else if (signal.timeframe > env.TIMEFRAME) {
            //     return weight
            // }

            // let ema10 = (ema10_full);
            // let ema20 = (ema20_full);
            // let ema10Prev = (ema10);
            // let ema20Prev = (ema20);
            //
            // if (signal.timeframe <= env.TIMEFRAME) {
            //     ema10 = _.tail(ema10_full);
            //     ema20 = _.tail(ema20_full);
            //     ema10Prev = _.tail(ema10);
            //     ema20Prev = _.tail(ema20);
            // }
            // let cross = isCrossing({ indic1: ema10Prev, indic2: ema20Prev });
            // if (cross.crossing) {
            //     if (_.last(ema10) - _.last(ema20) > .1) {
            //         //crossing confirmed
            //         debugger;
            //     }
            //     // reset(ema10, 1);
            //     // reset(ema20, 1);
            //     // reset(ema10, options.minCount);
            //     // reset(ema20, options.minCount);
            //     indicators.ema_crossing = true;
            // }

            // let ok = false;
            // if (_.min([ema10.length, ema20.length]) >= options.minCount) {
            //
            //     let ema10_cur = _.last(ema10);
            //     let ema20_cur = _.last(ema20);
            //     let ema10_0 = _.head(ema10);
            //     let ema20_0 = _.head(ema20);
            //     indicators.ema_distance = distance(ema10_cur, ema20_cur);
            //     indicators.ema_0_distance = distance(ema10_0, ema20_0);
            //     let ecarts10 = getEcarts(ema10);
            //     let ecarts20 = getEcarts(ema20);
            //
            //     ok = ema10_cur > ema20_cur
            //     ok = ok && indicators.ema_distance > options.minDistance
            //
            //     // && indicators.ema_distance >= indicators.ema_0_distance;
            //     if (signal.timeframe <= env.TIMEFRAME) {
            //         ok = ok && isSorted(_.initial(ema10), options.minCount)
            //         ok = ok && isSorted((ema10), options.minCount)
            //         ok = ok && isSorted((ema20), options.minCount)
            //         ok = ok && isSorted(ecarts10) && isSorted(ecarts20);
            //     }
            // }
            // return +ok && weight;

            // function getEmaAngle() {
            //     let ema10_0 = _.first(ema10);
            //     let ema10_1 = _.last(ema10);
            //     let ema20_0 = _.first(ema20);
            //     let ema20_1 = _.last(ema20);
            //     let ema10y = 10e8 * (ema10_1.value - ema10_0.value);
            //     let ema10x = (1 / 1e3) * (ema10_1.time - ema10_0.time);
            //     let ema20y = 10e8 * (ema20_1.value - ema20_0.value);
            //     let ema20x = (1 / 1e3) * (ema20_1.time - ema20_0.time);
            //     let ema10_angle = toDegre(Math.acos(ema10x / Math.sqrt(ema10x ** 2 + ema10y ** 2)))
            //     let ema20_angle = toDegre(Math.acos(ema20x / Math.sqrt(ema20x ** 2 + ema20y ** 2)))
            //     let ema_angle = ema10_angle - ema20_angle;
            //     return ema_angle;
            //
            //     function toDegre(num) {
            //         return num * 180 / Math.PI
            //     }
            // }
        },

        MACD({ weight, signal, options }) {
            //macd >macd_signal
            let { indicators } = signal;
            let { macd, macd_signal } = indicators;
            indicators.MACD = _.last(macd) > _.last(macd_signal);
            let crossingData;
            indicators.macdData = _.extend({
                macd: _.last(macd),
                macd_signal: _.last(macd_signal),
                distance: distance(_.last(macd), _.last(macd_signal))
            }, crossingData = getCrossingData({ upSignals: macd, downSignals: macd_signal }));
            cleanUpOldSignals({ signals: [macd, macd_signal], crossingData });

            return +indicators.MACD && weight;

            // let ok = false;
            // if (_.min([macd.length, macd_signal.length]) >= options.minCount) {
            //
            //
            //     let macd_cur = _.last(macd);
            //     let macd_signal_cur = _.last(macd_signal);
            //     let macd_0 = _.head(macd);
            //     let macd_signal_0 = _.head(macd_signal);
            //     indicators.macd_distance = distance(macd_cur, macd_signal_cur);
            //     indicators.macd_0_distance = distance(macd_0, macd_signal_0);
            //     ok = macd_cur > macd_signal_cur
            //     // ok = ok && isSorted((macd), options.minCount)
            //     // ok = ok && isSorted((macd_signal), options.minCount)
            //     ok = ok && indicators.macd_distance > options.minDistance
            //     // && indicators.macd_distance >= indicators.macd_0_distance;
            //
            //
            // }
            // return +ok && weight;

        },
        AROON({ weight, signal, options }) {
            let { indicators } = signal;
            let { aroon_up, aroon_down } = indicators;

            // if (isCrossing({ indic1: aroon_up, indic2: aroon_down })) {
            //     reset(aroon_up, options.minCount);
            //     reset(aroon_down, options.minCount);
            //     indicators.aroon_crossing = true;
            // }

            let ok = false;
            if (_.min([aroon_up.length, aroon_down.length]) >= options.minCount) {


                let aroon_up_cur = _.last(aroon_up);
                let aroon_down_cur = _.last(aroon_down);
                indicators.aroon_distance = aroon_up_cur - aroon_down_cur;
                ok = aroon_up_cur > aroon_down_cur
                    && aroon_up_cur >= options.upReference
                    && aroon_down_cur < options.downReference
                    && indicators.aroon_distance >= options.minDistance;

                // if (ok && _.min([aroon_up.length, aroon_down.length]) > 1) {
                //     ok = indicators.aroon_up_trendingUp && indicators.aroon_down_trendingDown
                // }


            }
            return +ok && weight;
        },
        ADX({ weight, signal, options }) {

            let { indicators } = signal;
            let crossingData, { adx, adx_minus_di, adx_plus_di } = indicators;

            indicators.ADXDI = _.last(adx_plus_di) > _.last(adx_minus_di);


            indicators.adxDIData = _.extend({
                distance: (_.last(adx_plus_di) - _.last(adx_minus_di))
            }, crossingData = getCrossingData({ upSignals: adx_plus_di, downSignals: adx_minus_di }));
            cleanUpOldSignals({ signals: [adx_minus_di, adx_plus_di], crossingData });

            let adxValue = _.last(adx);
            let adxAboveReference = adxValue > options.buyReference;
            indicators.adxData = _.extend({
                adx_trending_up: isAdxOk(),
                aboveReference: adxAboveReference,
                value: adxValue,
            }, crossingData = getCrossingData({
                upSignals: adx,
                downSignals: _.fill(new Array(adx.length), options.buyReference)
            }));
            cleanUpOldSignals({ signals: [adx], crossingData });

            return +isAdxOk() && weight;

            function isAdxOk() {
                if (adxAboveReference && indicators.ADXDI) {
                    if (adxValue < options.buyReference + 5) {
                        return _.last(_.initial(adx)) < adxValue;
                    }
                    return true;
                }
                return false
            }

//
// if (isCrossing({ indic1: adx_plus_di, indic2: adx_minus_di })) {
//     reset(adx_plus_di, options.minCount);
//     reset(adx_minus_di, options.minCount);
//     indicators.adx_crossing = true;
// }
// adx = _.takeRightWhile(adx, v => v >= options.buyReference);
// let ok = false;
// let minCount = options.minCountTimeframe && options.minCountTimeframe[timeframe] || options.minCount;
// if (_.min([adx.length, adx_minus_di.length, adx_plus_di.length]) >= minCount) {
//
//     let minus_di_cur = _.last(adx_minus_di);
//     let plus_di_cur = _.last(adx_plus_di);
//     let plus_di_0 = _.head(adx_plus_di);
//     let minus_di_0 = _.head(adx_minus_di);
//     let ecarts = getEcarts(adx);
//     indicators.adx_di_distance = plus_di_cur - minus_di_cur;
//     indicators.adx_di_0_distance = plus_di_0 - minus_di_0;
//     ok = _.last(adx) > options.buyReference
//     ok = ok && _.last(_.initial(adx)) > options.buyReference
//     ok = ok && plus_di_cur > minus_di_cur
//     ok = ok && indicators.adx_di_distance > options.minDIDistance
//     // && indicators.adx_di_distance >= indicators.adx_di_0_distance
//
//     ok = ok && isSorted((adx), minCount) && isSorted((adx), minCount + 1);
//
//     if (timeframe <= env.TIMEFRAME) {
//
//         // ok = ok && (isSorted((adx_plus_di), minCount) && isSorted((adx_minus_di), minCount, { reverse: true }))
//         // && (isSorted((adx_plus_di), options.minCount) || isSorted((adx_minus_di), options.minCount, { reverse: true }))
//         // && isCrossingReference()
//         // ok = ok && isSorted(ecarts)
//     }
// }
// return +ok && weight;
//
// function isCrossingReference() {
//     return _.min(adx) < options.buyReference && _.max(adx) > options.buyReference;
// }
        },

        VWMA({ weight, signal }) {
            // vwma buy when it's < close price
            let { indicators, close } = signal;
            let { vwma } = indicators;
            let ok = false;
            if (vwma.length >= 1) {
                let vwma_cur = _.last(vwma);
                ok = (vwma_cur < close);
            }
            return +ok && weight;
        }
        ,

        RSI({ weight, signal, options }) {
            let { indicators } = signal;
            let { rsi } = indicators;
            let ok = false;
            if (rsi.length >= 1) {
                let rsi_cur = _.last(rsi);
                ok = (rsi_cur <= options.buyReference);
            }
            return +ok && weight;
        }
    }


}
;

function isSorted(list, minCount, { reverse = false } = {}) {
    let array = _.slice(list, -minCount);
    // let trendingUp = getChangePercent(_.head(list), _.last(list));
    // trendingUp = reverse ? trendingUp <= 0 : trendingUp >= 0;
    return sorted(reverse ? array.reverse() : array) //|| trendingUp;
    // return sorted(slist, reverse ? (a, b) => b - a : void 0) || trendingUp;
}

function getEcarts(list) {

    if (list.length < 2) return [0];
    if (list.length === 2) {
        let [a, b] = list;
        return [b - a];
    }
    if (list.length > 2) {
        return getEcarts(list.slice(0, 2)).concat(getEcarts(_.tail(list)));
    }

}

function distance(pointA, pointB) {
    return +((pointA - pointB) / pointB * 100).toFixed(2)
}

+function validateSettings() {
    _.forEach(module.exports.settings, s => {
        if (s.bonus && s.mandatory) {
            emitException("Indicator " + s.indicator + " has bad config BONUS+MANDATORY")
            process.exit(1);
        }
    })
}();
