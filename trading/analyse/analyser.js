const debug = require('debug')('analyse:index');
const _ = require('lodash');
const { checkers: indicatorCheckers, settings: indicatorSettings, mandatoryIndicators } = require('./indicators');


function analyseSignal({ signal24h, depth, signal, longSignal, MIN_BUY_WEIGHT }) {

    let signalResult = _.reduce(indicatorSettings, (signalResult, indicatorStetting) => {

        let { check, weight, indicator, mandatory, options } = indicatorStetting;
        let { totalWeight, signalWeight, signalWeightPercent, stopCheck, indicatorsResult, buy } = signalResult;
        if (!stopCheck && check) {

            let thisIndicatorSignalWeight = indicatorCheckers[indicator]({
                weight, signal24h, depth, signal, longSignal,
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
    if (signalResult.buy) {
        signalResult.buy = _.reduce(mandatoryIndicators, (buy, mInd) => {
            return buy && signalResult.indicatorsResult[mInd];
        }, true)
    }
    signalResult.symbol = signal.symbol;
    logSignalResult(signalResult);
    return signalResult;
}


const symbolsData = {};
const MAX_LENGTH = 10, MIN_BUY_WEIGHT = 70 / 100;

function isNewCandle({ signal, lastSignal }) {
    return signal.open !== lastSignal.open;
}

function getNewIndicators({ signal, lastSignal }) {
    return _.reduce(signal.indicators, (prevIndicators, indValue, indKey) => {
        if (!_.isArray(prevIndicators[indKey])) {
            prevIndicators[indKey] = [prevIndicators[indKey]];
        }

        if (isNewCandle({ signal, lastSignal })) {
            prevIndicators[indKey] = prevIndicators[indKey].concat(indValue).slice(-MAX_LENGTH);
        } else {
            prevIndicators[indKey].length > 1 && prevIndicators[indKey].pop();
            prevIndicators[indKey].push(indValue);
        }
        if (prevIndicators[indKey].length > 1) {
            let [oldValue, newValue] = prevIndicators[indKey].slice(-2);
            // lastSignal.indicators[indKey + '_trendingUp'] = oldValue < newValue;
            // lastSignal.indicators[indKey + '_trendingDown'] = oldValue > newValue;
        }
        return prevIndicators;
    }, lastSignal.indicators);
}

function getSignalResult({ signal24h, depth, signal, longSignal }) {
    let { symbol } = signal;
    let lastSignal = symbolsData[symbol] = symbolsData[symbol] || signal;
    lastSignal.indicators = getNewIndicators({ signal, lastSignal });
    isNewCandle({ lastSignal, signal }) && _.extend(lastSignal, _.omit(signal, 'indicators'));
    signal.indicators = lastSignal.indicators;
    let signalResult = analyseSignal({ signal24h, depth, signal, longSignal, MIN_BUY_WEIGHT });

    return {
        signal24h,
        depth,
        signal,
        longSignal,
        buy: signalResult.buy,
        signalResult
    }
}

function logSignalResult(signalResult) {
    let strIndicators = _(signalResult.indicatorsResult).map((v, k) => [k, v]).filter(([k, v]) => v).map(([k, v]) => k).value().join(' ');
    let ok = signalResult.buy ? 'OK' : 'NOK';
    signalResult.signalWeight > 2 && debug(`${signalResult.symbol} ${signalResult.signalWeight} ${strIndicators} -> ${ok}`);
}


module.exports = { getSignalResult };
