const debug = require('debug')('analyse:index');
const _ = require('lodash');
const { checkers: indicatorCheckers, settings: indicatorSettings } = require('./indicators');


function analyseSignal({ ticker, depth, signal, longSignal, MIN_BUY_WEIGHT }) {

    let signalResult = _.reduce(indicatorSettings, (signalResult, indicatorStetting) => {

        let { check, weight, indicator, mandatory, options } = indicatorStetting;
        let { totalWeight, signalWeight, signalWeightPercent, stopCheck, indicatorsResult, buy } = signalResult;
        if (!stopCheck && check) {

            let thisIndicatorSignalWeight = indicatorCheckers[indicator]({
                weight, ticker, depth, signal, longSignal,
                options
            });
            indicatorsResult[indicator] = Boolean(thisIndicatorSignalWeight);
            if (mandatory && !indicatorsResult[indicator]) {
                stopCheck = true;
            } else {
                signalWeight += thisIndicatorSignalWeight;
                totalWeight += weight;
                signalWeightPercent = signalWeight / totalWeight;
                buy = signalWeightPercent >= MIN_BUY_WEIGHT;
            }
        }
        if (stopCheck) {
            buy = false;
        }

        return { totalWeight, signalWeight, signalWeightPercent, stopCheck, indicatorsResult, buy };
    }, {
        totalWeight: 0,
        signalWeight: 0,
        signalWeightPercent: 0,
        stopCheck: false,
        indicatorsResult: {},
        buy: false
    });
    signalResult.symbol = signal.symbol;
    logSignalResult(signalResult);
    return signalResult;
}


const symbolsData = {};
const MAX_LENGTH = 10, MIN_BUY_WEIGHT = 70 / 100;

function getSignalResult({ ticker, depth, signal, longSignal }) {
    let { symbol } = signal;
    let prevSignal = symbolsData[symbol] || signal;

    let lastSignal = symbolsData[symbol] = _.extend(prevSignal, _.omit(signal, 'indicators'));
    prevSignal.indicators = _.reduce(signal.indicators, (prevIndicators, indValue, indKey) => {
        if (!_.isArray(prevIndicators[indKey])) {
            prevIndicators[indKey] = [{ value: prevIndicators[indKey], time: signal.time }];
        }
        let { value: lastValue } = _.last(prevIndicators[indKey]);
        let newValue = indValue;

        if (lastValue !== newValue) {
            prevIndicators[indKey] = prevIndicators[indKey]
                .concat({
                    value: indValue,
                    time: signal.time
                }).slice(-MAX_LENGTH);
            prevSignal.indicators[indKey + '_trendingUp'] = lastValue < newValue;
            prevSignal.indicators[indKey + '_trendingDown'] = lastValue > newValue;
        }
        return prevIndicators;
    }, prevSignal.indicators);

    let signalResult = analyseSignal({ ticker, depth, signal: lastSignal, longSignal, MIN_BUY_WEIGHT });

    return {
        ticker,
        depth,
        signal: lastSignal,
        longSignal,
        buy: signalResult.buy,
        signalResult
    }
}

function logSignalResult(signalResult) {
    let strIndicators = _(signalResult.indicatorsResult).map((v, k) => [k, v]).filter(([k, v]) => v).map(([k, v]) => k).value().join(' ');
    let ok = signalResult.buy ? 'OK' : 'NOK';
    signalResult.signalWeight > 2 && console.log(`${signalResult.symbol} ${signalResult.signalWeight} ${strIndicators} ${ok}`);
}


module.exports = { getSignalResult };
