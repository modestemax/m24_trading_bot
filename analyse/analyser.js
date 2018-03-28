const debug = require('debug')('analyse:index');
const _ = require('lodash');
const {checkers: indicatorCheckers, settings: indicatorSettings} = require('./indicators');

module.exports = function ({ticker, depth, signal, longSignal, MIN_BUY_WEIGHT}) {

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
};