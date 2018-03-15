const _ = require('lodash');
const updateIndicator = (() => {
    let symbolsData = {};
    return (sdata) => {
        let {symbol} = sdata;
        let lastSymbolData = symbolsData[symbol];
        if (!lastSymbolData) {
            lastSymbolData = symbolsData[symbol] = sdata;
        } else {
            lastSymbolData.indicators = _.reduce(sdata.indicators, (oldIndicators, indValues, indKey) => {
                let lastValue = _.last(oldIndicators[indKey]);
                let newValue = _.last(indValues);
                if (indKey === 'adx') {
                    lastSymbolData.indicators['adx_ok'] = lastValue > 30;
                }
                if (lastValue !== newValue) {
                    oldIndicators[indKey] = oldIndicators[indKey].concat(indValues).slice(-5)
                    let trend = lastSymbolData.indicators[indKey + '_trend'] = lastValue < newValue ? 1 : -1;
                    if (indKey === 'adx') {
                        let signal_ok = lastSymbolData.indicators['adx_ok'];
                        lastSymbolData.indicators['adx_decisive'] = trend === 1 && signal_ok;
                    }
                }
                return oldIndicators;
            }, lastSymbolData.indicators);
        }
        _.extend(lastSymbolData, _.omit(sdata, 'indicators'));
        lastSymbolData.indicatorsStatus = getIndicatorStatus(lastSymbolData)
        lastSymbolData.indicatorsStatus();
        return lastSymbolData;

    }
})();

function getIndicatorStatus(symbolData) {

    return function () {
        let {indicators} = symbolData;
        let {ema10, ema20} = indicators;
        indicators.ema_ok = _.last(ema10) > _.last(ema20);
        let [ema10_pre, ema10_cur] = ema10.slice(-2);
        let [ema20_pre, ema20_cur] = ema20.slice(-2);
        indicators.ema_crossing_up = ema10_pre <= ema20_pre && ema10_cur > ema20_cur;
        indicators.ema_crossing_down = ema10_pre >= ema20_pre && ema10_cur < ema20_cur;
        indicators.ema_crossing = indicators.ema_crossing_up || indicators.ema_crossing_down;
        // debugger
    }

}

appEmitter.on('tv:signals', (data) => {
    _.each(data, (symbolData) => {
        let newData = updateIndicator(symbolData);
        setImmediate(() => appEmitter.emit('analyse:try_trade', newData));
    })

});