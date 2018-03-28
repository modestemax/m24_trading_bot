const debug = require('debug')('analyse:index');
const _ = require('lodash');
const {checkers: indicatorCheckers, settings: indicatorSettings} = require('./indicators');

module.exports = function ({ticker, depth, signal, longSignal, MIN_BUY_WEIGHT}) {
    // let {indicators, close} = signal;
    // indicators.weight = 0;
    // signal.buy = false;

    // let totalWeight = 0;
    // let signalWeight = 0;

    let signalResult = _.reduce(indicatorSettings, (signalResult, indicatorStetting) => {

        let {check, weight, indicator, mandatory, options} = indicatorStetting;
        let {totalWeight, signalWeight, previousSignalWeight, previousIsMandatory, stopCheck, indicatorsResult, buy} = signalResult;

        if (check) {
            if (!stopCheck) {
                if (!previousIsMandatory || (previousIsMandatory && previousSignalWeight)) {
                    previousSignalWeight = indicatorCheckers[indicator]({
                        weight, ticker, depth, signal, longSignal,
                        options
                    });
                    previousIsMandatory = mandatory;
                    indicatorsResult[indicator] = Boolean(previousSignalWeight);
                    signalWeight += previousSignalWeight;
                } else {
                    stopCheck = true
                }
            }
            totalWeight += weight;
        }
        buy = signalWeight / totalWeight >= MIN_BUY_WEIGHT;
        // stopCheck = buy || stopCheck;
        return {totalWeight, signalWeight, previousSignalWeight, previousIsMandatory, stopCheck, indicatorsResult, buy};
    }, {
        totalWeight: 0,
        signalWeight: 0,
        previousSignalWeight: 0,
        previousIsMandatory: false,
        stopCheck: false,
        indicatorsResult: {},
        buy: false
    });

    return signalResult;
    //
    // totalWeight += checkLongTrendStatus();
    // indicators.trendLong_ok && check24TrendStatus();
    // if (indicators.weight >= 1) {
    //     totalWeight += checkBidAskVolumeDepthStatus() +
    //         checkEmaStatus() +
    //         checkMacdStatus() +
    //         checkAroonStatus() +
    //         checkAdxStatus() +
    //         checkVwmaStatus() +
    //         checkRsiStatus();
    //     signal.buy = indicators.weight / totalWeight >= MIN_BUY_WEIGHT;
    // }

    // function checkLongTrendStatus(weight = .5) {
    //     indicators.trendLong_ok = Boolean(longSignal) && (longSignal.changePercent > CHANGE_LONG_TIMEFRAME_FOR_TRADE);
    //     indicators.weight += M24_SETTINGS.INDICATORS.CHECK_LONG_SIGNAL ? indicators.trendLong_ok && weight : weight;
    //     return weight;
    // }
    //
    // function check24TrendStatus(weight = .5) {
    //     indicators.trend24_ok = Boolean(ticker) && (ticker.percentage > CHANGE_24H_FOR_TRADE);
    //     indicators.weight += M24_SETTINGS.INDICATORS.CHECK_24_TREND ? indicators.trend24_ok && weight : weight;
    //     return weight;
    // }
    //
    // function checkBidAskVolumeDepthStatus(weight = 1) {
    //     indicators.bid_ask_volume_ok = Boolean(depth) && (depth.bidBTC > depth.askBTC);
    //     indicators.weight += M24_SETTINGS.INDICATORS.CHECK_BID_ASK_VOLUME ? indicators.bid_ask_volume_ok && weight : weight;
    //     return weight;
    // }
    //
    // function checkEmaStatus(weight = 1) {
    //     let {ema10, ema20} = indicators;
    //
    //     if (_.min([ema10.length, ema20.length]) >= MIN_LENGTH) {
    //         let [{value: ema10_pre}, {value: ema10_cur}] = ema10.slice(-2);
    //         let [{value: ema20_pre}, {value: ema20_cur}] = ema20.slice(-2);
    //         let [{value: ema10_0},] = ema10;
    //         let [{value: ema20_0},] = ema20;
    //         indicators.ema_crossing_up = ema10_pre <= ema20_pre && ema10_cur > ema20_cur;
    //         indicators.ema_crossing_down = ema10_pre >= ema20_pre && ema10_cur < ema20_cur;
    //         indicators.ema_crossing = indicators.ema_crossing_up || indicators.ema_crossing_down;
    //         indicators.ema_distance = distance(ema10_cur, ema20_cur);
    //         indicators.ema_0_distance = distance(ema10_0, ema20_0);
    //         indicators.ema_ok = ema10_cur > ema20_cur
    //             && indicators.ema10_trendingUp
    //             && isSorted(values(indicators.ema10))
    //             && indicators.ema20_trendingUp
    //             && isSorted(values(indicators.ema20))
    //             // && (indicators.ema_distance > EMA_DISTANCE_REF || indicators.ema_crossing_up)
    //             && indicators.ema_distance > EMA_DISTANCE_REF
    //             && indicators.ema_distance >= indicators.ema_0_distance;
    //         indicators.weight += indicators.ema_ok && weight;
    //     }
    //     return weight;
    //
    //
    //     function getEmaAngle() {
    //         let ema10_0 = _.first(ema10);
    //         let ema10_1 = _.last(ema10);
    //         let ema20_0 = _.first(ema20);
    //         let ema20_1 = _.last(ema20);
    //         let ema10y = 10e8 * (ema10_1.value - ema10_0.value);
    //         let ema10x = (1 / 1e3) * (ema10_1.time - ema10_0.time);
    //         let ema20y = 10e8 * (ema20_1.value - ema20_0.value);
    //         let ema20x = (1 / 1e3) * (ema20_1.time - ema20_0.time);
    //         let ema10_angle = toDegre(Math.acos(ema10x / Math.sqrt(ema10x ** 2 + ema10y ** 2)))
    //         let ema20_angle = toDegre(Math.acos(ema20x / Math.sqrt(ema20x ** 2 + ema20y ** 2)))
    //         let ema_angle = ema10_angle - ema20_angle;
    //         return ema_angle;
    //
    //         function toDegre(num) {
    //             return num * 180 / Math.PI
    //         }
    //     }
    //
    // }
    //
    // function checkMacdStatus(weight = 1) {
    //     //macd >macd_signal
    //     let {macd, macd_signal} = indicators;
    //
    //     if (_.min([macd.length, macd_signal.length]) >= MIN_LENGTH) {
    //         let [{value: macd_pre}, {value: macd_cur}] = macd.slice(-2);
    //         let [{value: macd_signal_pre}, {value: macd_signal_cur}] = macd_signal.slice(-2);
    //         let [{value: macd_0},] = macd;
    //         let [{value: macd_signal_0},] = macd_signal;
    //         indicators.macd_crossing_up = macd_pre <= macd_signal_pre && macd_cur > macd_signal_cur;
    //         indicators.macd_crossing_down = macd_pre >= macd_signal_pre && macd_cur < macd_signal_cur;
    //         indicators.macd_crossing = indicators.macd_crossing_up || indicators.macd_crossing_down;
    //         indicators.macd_distance = distance(macd_cur, macd_signal_cur);
    //         indicators.macd_0_distance = distance(macd_0, macd_signal_0);
    //         indicators.macd_ok = macd_cur > macd_signal_cur
    //             && indicators.macd_trendingUp
    //             && isSorted(values(indicators.macd))
    //             && indicators.macd_signal_trendingUp
    //             && isSorted(values(indicators.macd_signal))
    //             // && (indicators.macd_distance > macd_DISTANCE_REF || indicators.macd_crossing_up)
    //             && indicators.macd_distance > MACD_DISTANCE_REF
    //             && indicators.macd_distance >= indicators.macd_0_distance;
    //         indicators.weight += indicators.macd_ok && weight;
    //     }
    //     return weight;
    //
    // }
    //
    // function checkAroonStatus(weight = 1) {
    //     let {aroon_up, aroon_down} = indicators;
    //
    //     if (_.min([aroon_up.length, aroon_down.length]) >= 1) {
    //         let {value: aroon_up_cur} = _.last(aroon_up);
    //         let {value: aroon_down_cur} = _.last(aroon_down);
    //         indicators.aroon_distance = aroon_up_cur - aroon_down_cur;
    //         indicators.aroon_ok = aroon_up_cur > aroon_down_cur
    //             && aroon_up_cur >= 70
    //             && aroon_down_cur < 30
    //             && indicators.aroon_distance >= AROON_DISTANCE_REF
    //         ;
    //         if (indicators.aroon_ok && _.min([aroon_up.length, aroon_down.length]) > 1) {
    //             indicators.aroon_ok = indicators.aroon_up_trendingUp && indicators.aroon_down_trendingDown
    //         }
    //         indicators.weight += indicators.aroon_ok && weight;
    //     }
    //     return weight;
    // }
    //
    // function checkAdxStatus(weight = 1) {
    //     let {adx, adx_trendingUp, adx_minus_di_trendingDown, adx_plus_di_trendingUp, adx_minus_di, adx_plus_di} = indicators;
    //
    //     if (_.min([adx.length, adx_minus_di.length, adx_plus_di.length]) >= MIN_LENGTH) {
    //         let [{value: minus_di_pre}, {value: minus_di_cur}] = adx_minus_di.slice(-2);
    //         let [{value: plus_di_pre}, {value: plus_di_cur}] = adx_plus_di.slice(-2);
    //         indicators.adx_di_distance = plus_di_cur - minus_di_cur;
    //         indicators.adx_ok = _.last(adx).value > ADX_REF
    //             && plus_di_cur > minus_di_cur
    //             && indicators.adx_di_distance > ADX_DI_DISTANCE_REF
    //             && adx_plus_di_trendingUp
    //             && adx_minus_di_trendingDown
    //             && adx_trendingUp
    //             && isSorted(values(indicators.adx))
    //             && isSorted(values(indicators.adx_plus_di))
    //             && isSorted(values(indicators.adx_minus_di), {reverse: true})
    //         indicators.weight += indicators.adx_ok && weight;
    //     }
    //     return weight;
    // }
    //
    // function checkVwmaStatus(weight = 1) {
    //     // vwma buy when it's < close price
    //     let {vwma} = indicators;
    //     if (vwma.length < 1) return;
    //     let {value: vwma_cur} = _.last(vwma);
    //     indicators.vwma_ok = (vwma_cur < close);
    //     indicators.weight += indicators.vwma_ok && weight;
    //     return weight;
    // }
    //
    // function checkRsiStatus(weight = 1) {
    //     let {rsi} = indicators;
    //     if (rsi.length < 1) return;
    //     let {value: rsi_cur} = _.last(rsi);
    //     indicators.rsi_ok = (rsi_cur < RSI_REF);
    //     indicators.weight += indicators.rsi_ok && weight;
    //     return weight;
    // }
    //
    // function isSorted(list, {reverse = false} = {}) {
    //     let slist = _.slice(list, -MIN_LENGTH);
    //     let trendingUp = getChangePercent(_.head(list), _.last(list));
    //     trendingUp = reverse ? trendingUp < 0 : trendingUp > 0;
    //     return sorted(slist, reverse ? (a, b) => b - a : void 0)
    //         || trendingUp;
    // }
    //
    // function values(list) {
    //     return _.map(list, l => l.value)
    // }

}