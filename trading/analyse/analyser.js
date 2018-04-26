const debug = require('debug')('analyse');
const debug2 = require('debug')('analyse2');
const _ = require('lodash');
const { checkers: indicatorCheckers, settings: indicatorSettings, mandatoryIndicators } = require('./indicators');


function analyseSignal({ signal24h, depth, signal, longSignal, MIN_BUY_WEIGHT }) {
    const activeSettings = _.filter(indicatorSettings, { check: true });
    let signalResult = _.reduce(activeSettings, (signalResult, indicatorStetting) => {

            let { weight, indicator, mandatory, bonus, options } = indicatorStetting;
            let { totalWeight, signalWeight, signalWeightPercent, stopCheck, indicatorsResult, buy } = signalResult;
            if (!stopCheck) {

                let thisIndicatorSignalWeight = indicatorCheckers[indicator]({
                    weight, signal24h, depth, signal, longSignal,
                    options
                });
                indicatorsResult[indicator] = Boolean(thisIndicatorSignalWeight);
                if (mandatory && !indicatorsResult[indicator] && signal.timeframe <= env.TIMEFRAME) {
                    stopCheck = true;
                } else {
                    signalWeight += thisIndicatorSignalWeight;
                    totalWeight += bonus ? 0 : weight; //bonus do not count in final weight
                    signalWeightPercent = signalWeight / totalWeight;
                    buy = signalWeightPercent >= MIN_BUY_WEIGHT;
                }
            }
            if (stopCheck) {
                buy = false;
            }

            return { totalWeight, signalWeight, signalWeightPercent, stopCheck, indicatorsResult, buy };
        },
        //initial result value
        {
            totalWeight: 0, signalWeight: 0, signalWeightPercent: 0, stopCheck: false, buy: false,
            indicatorsResult: {},
        }
    );
    _.extend(signalResult, {
        strongBuy: false,
        trendingUp: signalResult.indicatorsResult.EMA && signalResult.indicatorsResult.ADX
    });

    if (signalResult.buy) {
        signalResult.strongBuy = _.reduce(mandatoryIndicators, (buy, mInd) => {
            return buy && signalResult.indicatorsResult[mInd];
        }, true)
    }
    Object.assign(signalResult, _.pick(signal, ['symbol', 'timeframe']));
    logSignalResult(signalResult);
    return signalResult;
}


const symbolsData = {};
const MAX_LENGTH = 40, MIN_BUY_WEIGHT = 70 / 100;

function isNewCandle({ signal, lastSignal }) {
    return signal.timeframeId !== lastSignal.timeframeId    ;
}

function getNewIndicators({ signal, lastSignal }) {
    return _.reduce(signal.indicators, (prevIndicators, indValue, indKey) => {
        if (!_.isArray(prevIndicators[indKey])) {
            prevIndicators[indKey] = [prevIndicators[indKey]];
        }

        if (isNewCandle({ signal, lastSignal })) {
            prevIndicators[indKey] = prevIndicators[indKey].concat(indValue).slice(-MAX_LENGTH);
        } else {
            // prevIndicators[indKey].length > 1 &&
            prevIndicators[indKey].pop();
            prevIndicators[indKey].push(indValue);
        }
        // if (prevIndicators[indKey].length > 1) {
        //     let [oldValue, newValue] = prevIndicators[indKey].slice(-2);
        //     // lastSignal.indicators[indKey + '_trendingUp'] = oldValue < newValue;
        //     // lastSignal.indicators[indKey + '_trendingDown'] = oldValue > newValue;
        // }
        return prevIndicators;
    }, lastSignal.indicators);
}

function getSignalResult({ signal24h, depth, signal, longSignal }) {
    signal24h = signal24h && _.cloneDeep(signal24h);
    signal = signal && _.cloneDeep(signal);
    longSignal = longSignal && _.cloneDeep(longSignal);
    depth = depth && _.cloneDeep(depth);

    let { symbol, timeframe } = signal;
    symbolsData[timeframe] = symbolsData[timeframe] || {};
    let lastSignal = symbolsData[timeframe][symbol] = symbolsData[timeframe][symbol] || signal;
    lastSignal.indicators = getNewIndicators({ signal, lastSignal });
    isNewCandle({ lastSignal, signal }) && _.extend(lastSignal, _.omit(signal, 'indicators'));
    signal.indicators = lastSignal.indicators;
    let signalResult = analyseSignal({ signal24h, depth, signal, longSignal, MIN_BUY_WEIGHT });

    return {
        signal24h,
        depth,
        signal,
        longSignal,
        signalResult
    }
}

function logSignalResult(signalResult) {
    let { symbol, buy, strongBuy, timeframe, indicatorsResult, signalWeight, totalWeight } = signalResult;
    let strIndicators = _(indicatorsResult).map((v, k) => [k, v]).filter(([k, v]) => v).map(([k, v]) => k).value().join(' ');
    let ok = buy ? 'OK' : 'NOK';
    ok = strongBuy ? '++' + ok : ok;
    let buyRatio = signalWeight / totalWeight;
    buyRatio > 49 / 100 && buy && debug(`${timeframe} ${symbol} ${signalWeight}/${totalWeight} ${strIndicators}  -> ${ok}`);
    buyRatio > 49 / 100 && !buy && debug2(`${timeframe} ${symbol} ${signalWeight}/${totalWeight} ${strIndicators} -> ${ok}`);
}


module.exports = { getSignalResult };
