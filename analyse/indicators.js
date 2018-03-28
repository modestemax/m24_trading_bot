const _ = require('lodash');
const sorted = require('is-sorted')
const {getChangePercent, updatePrice} = require('../utils');

const ADX_REF = 30, RSI_REF = 30, EMA_DISTANCE_REF = .2, MACD_DISTANCE_REF = .2, AROON_DISTANCE_REF = 50,
    ADX_DI_DISTANCE_REF = 5, MIN_BUY_WEIGHT = 70 / 100, CHANGE_24H_FOR_TRADE = 2,
    CHANGE_LONG_TIMEFRAME_FOR_TRADE = 1,
    MIN_LENGTH = 3

module.exports = {
    settings : [
        {
            indicator: 'LONG_TREND', check: true, weight: .5, mandatory: true,
        },
        {
            indicator: '24H_TREND', check: true, weight: .5, mandatory: true,
        },
        {
            indicator: 'BID_ASK_VOLUME', check: true, weight: 1, mandatory: false,
        },
        {
            indicator: 'EMA', check: true, weight: 1, mandatory: false,
        },
        {
            indicator: 'MACD', check: true, weight: 1, mandatory: false,
        },
        {
            indicator: 'AROON', check: true, weight: 1, mandatory: false,
        },
        {
            indicator: 'ADX', check: true, weight: 1, mandatory: false,
        },
        {
            indicator: 'VWMA', check: true, weight: 1, mandatory: false,
        },
        {
            indicator: 'RSI', check: false, weight: 1, mandatory: false,
        },
    ],
    checkers:{
        LONG_TREND({weight, longSignal}) {
            let ok = Boolean(longSignal) && (longSignal.changePercent > CHANGE_LONG_TIMEFRAME_FOR_TRADE);
            return +ok && weight
        },

        '24H_TREND'({weight, ticker}) {
            let ok = Boolean(ticker) && (ticker.percentage > CHANGE_24H_FOR_TRADE);
            return +ok && weight;

        },

        BID_ASK_VOLUME({weight, depth}) {
            let ok = Boolean(depth) && (depth.bidBTC > depth.askBTC);
            return +ok && weight;
        },
        EMA({weight, signal}) {
            let {indicators} = signal;
            let {ema10, ema20} = indicators;
            let ok = false;
            if (_.min([ema10.length, ema20.length]) >= MIN_LENGTH) {
                let [{value: ema10_pre}, {value: ema10_cur}] = ema10.slice(-2);
                let [{value: ema20_pre}, {value: ema20_cur}] = ema20.slice(-2);
                let [{value: ema10_0},] = ema10;
                let [{value: ema20_0},] = ema20;
                indicators.ema_crossing_up = ema10_pre <= ema20_pre && ema10_cur > ema20_cur;
                indicators.ema_crossing_down = ema10_pre >= ema20_pre && ema10_cur < ema20_cur;
                indicators.ema_crossing = indicators.ema_crossing_up || indicators.ema_crossing_down;
                indicators.ema_distance = distance(ema10_cur, ema20_cur);
                indicators.ema_0_distance = distance(ema10_0, ema20_0);
                ok = ema10_cur > ema20_cur
                    && indicators.ema10_trendingUp
                    && isSorted(values(indicators.ema10))
                    && indicators.ema20_trendingUp
                    && isSorted(values(indicators.ema20))
                    // && (indicators.ema_distance > EMA_DISTANCE_REF || indicators.ema_crossing_up)
                    && indicators.ema_distance > EMA_DISTANCE_REF
                    && indicators.ema_distance >= indicators.ema_0_distance;
            }
            return +ok && weight;

            function getEmaAngle() {
                let ema10_0 = _.first(ema10);
                let ema10_1 = _.last(ema10);
                let ema20_0 = _.first(ema20);
                let ema20_1 = _.last(ema20);
                let ema10y = 10e8 * (ema10_1.value - ema10_0.value);
                let ema10x = (1 / 1e3) * (ema10_1.time - ema10_0.time);
                let ema20y = 10e8 * (ema20_1.value - ema20_0.value);
                let ema20x = (1 / 1e3) * (ema20_1.time - ema20_0.time);
                let ema10_angle = toDegre(Math.acos(ema10x / Math.sqrt(ema10x ** 2 + ema10y ** 2)))
                let ema20_angle = toDegre(Math.acos(ema20x / Math.sqrt(ema20x ** 2 + ema20y ** 2)))
                let ema_angle = ema10_angle - ema20_angle;
                return ema_angle;

                function toDegre(num) {
                    return num * 180 / Math.PI
                }
            }
        },

        MACD({weight, signal}) {
            //macd >macd_signal
            let {indicators} = signal;
            let {macd, macd_signal} = indicators;
            let ok = false;
            if (_.min([macd.length, macd_signal.length]) >= MIN_LENGTH) {
                let [{value: macd_pre}, {value: macd_cur}] = macd.slice(-2);
                let [{value: macd_signal_pre}, {value: macd_signal_cur}] = macd_signal.slice(-2);
                let [{value: macd_0},] = macd;
                let [{value: macd_signal_0},] = macd_signal;
                indicators.macd_crossing_up = macd_pre <= macd_signal_pre && macd_cur > macd_signal_cur;
                indicators.macd_crossing_down = macd_pre >= macd_signal_pre && macd_cur < macd_signal_cur;
                indicators.macd_crossing = indicators.macd_crossing_up || indicators.macd_crossing_down;
                indicators.macd_distance = distance(macd_cur, macd_signal_cur);
                indicators.macd_0_distance = distance(macd_0, macd_signal_0);
                ok = macd_cur > macd_signal_cur
                    && indicators.macd_trendingUp
                    && isSorted(values(indicators.macd))
                    && indicators.macd_signal_trendingUp
                    && isSorted(values(indicators.macd_signal))
                    // && (indicators.macd_distance > macd_DISTANCE_REF || indicators.macd_crossing_up)
                    && indicators.macd_distance > MACD_DISTANCE_REF
                    && indicators.macd_distance >= indicators.macd_0_distance;
            }
            return +ok && weight;

        },
        AROON({weight, signal}) {
            let {indicators} = signal;
            let {aroon_up, aroon_down} = indicators;
            let ok = false;
            if (_.min([aroon_up.length, aroon_down.length]) >= 1) {
                let {value: aroon_up_cur} = _.last(aroon_up);
                let {value: aroon_down_cur} = _.last(aroon_down);
                indicators.aroon_distance = aroon_up_cur - aroon_down_cur;
                ok = aroon_up_cur > aroon_down_cur
                    && aroon_up_cur >= 70
                    && aroon_down_cur < 30
                    && indicators.aroon_distance >= AROON_DISTANCE_REF;

                // if (ok && _.min([aroon_up.length, aroon_down.length]) > 1) {
                //     ok = indicators.aroon_up_trendingUp && indicators.aroon_down_trendingDown
                // }
            }
            return +ok && weight;
        },
        ADX({weight, signal}) {

            let {indicators} = signal;
            let {adx, adx_trendingUp, adx_minus_di_trendingDown, adx_plus_di_trendingUp, adx_minus_di, adx_plus_di} = indicators;
            let ok = false;
            if (_.min([adx.length, adx_minus_di.length, adx_plus_di.length]) >= MIN_LENGTH) {
                let [{value: minus_di_pre}, {value: minus_di_cur}] = adx_minus_di.slice(-2);
                let [{value: plus_di_pre}, {value: plus_di_cur}] = adx_plus_di.slice(-2);
                indicators.adx_di_distance = plus_di_cur - minus_di_cur;
                ok = _.last(adx).value > ADX_REF
                    && plus_di_cur > minus_di_cur
                    && indicators.adx_di_distance > ADX_DI_DISTANCE_REF
                    && adx_plus_di_trendingUp
                    && adx_minus_di_trendingDown
                    && adx_trendingUp
                    && isSorted(values(indicators.adx))
                    && isSorted(values(indicators.adx_plus_di))
                    && isSorted(values(indicators.adx_minus_di), {reverse: true})

            }
            return +ok && weight;
        },

        VWMA({weight, signal}) {
            // vwma buy when it's < close price
            let {indicators, close} = signal;
            let {vwma} = indicators;
            let ok = false;
            if (vwma.length >= 1) {
                let {value: vwma_cur} = _.last(vwma);
                ok = (vwma_cur < close);
            }
            return +ok && weight;
        },

        RSI({weight, signal}) {
            let {indicators} = signal;
            let {rsi} = indicators;
            let ok = false;
            if (rsi.length >= 1) {
                let {value: rsi_cur} = _.last(rsi);
                ok = (rsi_cur < RSI_REF);
            }
            return +ok && weight;
        }
    }


}

function isSorted(list, {reverse = false} = {}) {
    let slist = _.slice(list, -MIN_LENGTH);
    let trendingUp = getChangePercent(_.head(list), _.last(list));
    trendingUp = reverse ? trendingUp < 0 : trendingUp > 0;
    return sorted(slist, reverse ? (a, b) => b - a : void 0)
        || trendingUp;
}

function values(list) {
    return _.map(list, l => l.value)
}

function distance(pointA, pointB) {
    return +((pointA - pointB) / pointB * 100).toFixed(2)
}