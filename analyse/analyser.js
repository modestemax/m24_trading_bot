const debug = require('debug')('analyse:index');
const _ = require('lodash');
const {checkers: indicatorCheckers, settings: indicatorSettings} = require('./indicators');

  function analyseSignal({ticker, depth, signal, longSignal, MIN_BUY_WEIGHT}) {

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
}


const symbolsData = {};
const MAX_LENGTH = 10, MIN_BUY_WEIGHT = 70 / 100;

function getSignalResult({ticker, depth, signal, longSignal}) {
    let {symbol} = signal;
    let prevSignal = symbolsData[symbol] || signal;

    let lastSignal = symbolsData[symbol] = _.extend(prevSignal, _.omit(signal, 'indicators'));
    prevSignal.indicators = _.reduce(signal.indicators, (prevIndicators, indValue, indKey) => {
        if (!_.isArray(prevIndicators[indKey])) {
            prevIndicators[indKey] = [{value: prevIndicators[indKey], time: signal.time}];
        }
        let {value: lastValue} = _.last(prevIndicators[indKey]);
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

    let signalResult = analyseSignal({ticker, depth, signal: lastSignal, longSignal, MIN_BUY_WEIGHT});

    return {
        ticker,
        depth,
        signal: lastSignal,
        longSignal,
        buy: signalResult.buy,
        buyWeight: signalResult.signalWeight,
        signalResult
    }
}

module.exports={getSignalResult};