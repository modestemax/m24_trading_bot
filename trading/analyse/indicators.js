const _ = require('lodash');
const sorted = require('is-sorted')
const { getChangePercent, updatePrice } = require('../utils')();


function reset(array, minCount) {
    array.splice(0, array.length - minCount)
}

function isCrossing({ indic1, indic2 }) {
    let [ind1_pre, ind1_cur] = indic1.slice(-2);
    let [ind2_pre, ind2_cur] = indic2.slice(-2);
    let crossing_up = ind1_pre <= ind2_pre && ind1_cur >= ind2_cur;
    let crossing_down = ind1_pre >= ind2_pre && ind1_cur <= ind2_cur;
    return { crossing: crossing_up || crossing_down, crossing_up, crossing_down };
}
const minCount=process.env.MIN_COUNT||2;

module.exports = {
    settings: [
        {
            indicator: 'CANDLE_COLOR', check: true, weight: 1, mandatory: true, options: { minChangePercent: .05 }
        },
        {
            indicator: 'LONG_TREND', check: true, weight: .5, bonus: true, mandatory: false,
            options: { minChangePercent: 1 }
        },
        {
            indicator: '24H_TREND', check: true, weight: 1, mandatory: true, options: { minChangePercent: 2 }
        },
        {
            indicator: 'BID_ASK_VOLUME', check: true, weight: 1, mandatory: false,
        },
        {
            indicator: 'EMA', check: true, weight: 1, mandatory: false, options: { minDistance: .1, minCount: minCount }
        },
        {
            indicator: 'MACD', check: true, weight: 1, mandatory: false, options: { minDistance: .1, minCount: minCount }
        },
        {
            indicator: 'AROON', check: true, weight: 1, mandatory: false,
            options: { minDistance: .2, upReference: 70, downReference: 30, minCount: 1 }
        },
        {
            indicator: 'ADX', check: true, weight: 1, mandatory: true,
            options: { buyReference: 20, minDIDistance: 5, minCount: minCount }
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
            let ok = Boolean(signal24h) && (signal24h.percentage >= options.minChangePercent);
            return +ok && weight;
        },

        BID_ASK_VOLUME({ weight, depth, options }) {
            let ok = Boolean(depth) && (depth.allBid > depth.allAsk)
            ;
            return +ok && weight;
        },
        EMA({ weight, signal, options }) {
            let { indicators } = signal;
            let { ema10, ema20 } = indicators;

            // if (isCrossing({ indic1: ema10, indic2: ema20 })) {
            //     // reset(ema10, 1);
            //     // reset(ema20, 1);
            //     // reset(ema10, options.minCount);
            //     // reset(ema20, options.minCount);
            //     indicators.ema_crossing = true;
            // }

            let ok = false;
            if (_.min([ema10.length, ema20.length]) >= options.minCount) {

                let ema10_cur = _.last(ema10);
                let ema20_cur = _.last(ema20);
                let ema10_0 = _.head(ema10);
                let ema20_0 = _.head(ema20);
                indicators.ema_distance = distance(ema10_cur, ema20_cur);
                indicators.ema_0_distance = distance(ema10_0, ema20_0);
                ok = ema10_cur > ema20_cur
                    // && indicators.ema10_trendingUp
                    && isSorted((indicators.ema10), options.minCount)
                    // && indicators.ema20_trendingUp
                    && isSorted((indicators.ema20), options.minCount)
                    // && (indicators.ema_distance > EMA_DISTANCE_REF || indicators.ema_crossing_up)
                    && indicators.ema_distance > options.minDistance
                    && indicators.ema_distance >= indicators.ema_0_distance;


            }
            return +ok && weight;

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

            // if (isCrossing({ indic1: macd, indic2: macd_signal })) {
            //     reset(macd, options.minCount);
            //     reset(macd_signal, options.minCount);
            //     indicators.macd_crossing = true;
            // }

            let ok = false;
            if (_.min([macd.length, macd_signal.length]) >= options.minCount) {


                let macd_cur = _.last(macd);
                let macd_signal_cur = _.last(macd_signal);
                let macd_0 = _.head(macd);
                let macd_signal_0 = _.head(macd_signal);
                indicators.macd_distance = distance(macd_cur, macd_signal_cur);
                indicators.macd_0_distance = distance(macd_0, macd_signal_0);
                ok = macd_cur > macd_signal_cur
                    // && indicators.macd_trendingUp
                    && isSorted((indicators.macd), options.minCount)
                    // && indicators.macd_signal_trendingUp
                    && isSorted((indicators.macd_signal), options.minCount)
                    // && (indicators.macd_distance > macd_DISTANCE_REF || indicators.macd_crossing_up)
                    && indicators.macd_distance > options.minDistance
                    && indicators.macd_distance >= indicators.macd_0_distance;


            }
            return +ok && weight;

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
            let { adx, /* adx_trendingUp, adx_minus_di_trendingDown, adx_plus_di_trendingUp, */adx_minus_di, adx_plus_di } = indicators;
            //
            // if (isCrossing({ indic1: adx_plus_di, indic2: adx_minus_di })) {
            //     reset(adx_plus_di, options.minCount);
            //     reset(adx_minus_di, options.minCount);
            //     indicators.adx_crossing = true;
            // }

            let ok = false;
            if (_.min([adx.length, adx_minus_di.length, adx_plus_di.length]) >= options.minCount) {


                let minus_di_cur = _.last(adx_minus_di);
                let plus_di_cur = _.last(adx_plus_di);
                let plus_di_0 = _.head(adx_plus_di);
                let minus_di_0 = _.head(adx_minus_di);
                let ecarts = getEcarts(adx);
                indicators.adx_di_distance = plus_di_cur - minus_di_cur;
                indicators.adx_di_0_distance = plus_di_0 - minus_di_0;
                ok = _.last(adx) > options.buyReference
                    && _.last(_.initial(adx)) > options.buyReference
                    && plus_di_cur > minus_di_cur
                    && indicators.adx_di_distance > options.minDIDistance
                    && indicators.adx_di_distance > indicators.adx_di_0_distance
                // && (adx_plus_di_trendingUp || adx_minus_di_trendingDown)
                // && (adx_plus_di_trendingUp && adx_minus_di_trendingDown)
                // && adx_trendingUp
                ok = ok && isSorted((adx), options.minCount)
                    && (isSorted((adx_plus_di), options.minCount) && isSorted((adx_minus_di), options.minCount, { reverse: true }))
                // && (isSorted((adx_plus_di), options.minCount) || isSorted((adx_minus_di), options.minCount, { reverse: true }))
                // && isCrossingReference()
                ok = ok && isSorted(ecarts)


            }
            return +ok && weight;

            function isCrossingReference() {
                return _.min(adx) < options.buyReference && _.max(adx) > options.buyReference;
            }
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
        },

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


};

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
        }
    })
}();
