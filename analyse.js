const _ = require('lodash');
const checkIndicators = (() => {
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

                if (lastValue !== newValue) {
                    oldIndicators[indKey] = oldIndicators[indKey].concat(indValues).slice(-5)
                    lastSymbolData.indicators[indKey + '_trend'] = lastValue < newValue ? 1 : -1;
                }
                return oldIndicators;
            }, lastSymbolData.indicators);
        }

        if (lastSymbolData.indicators.ema10.length > 4) {
            _.extend(lastSymbolData, _.omit(sdata, 'indicators'));
            lastSymbolData.checkStatus = getIndicatorStatusChecker(lastSymbolData)
            lastSymbolData.checkStatus();
            return lastSymbolData;
        }
        if (lastSymbolData.trading) {
            return lastSymbolData
        }
    }
})();

function getIndicatorStatusChecker(symbolData) {
    const ADX_REF = 30, RSI_REF = 30;
    return function () {
        let {indicators, symbol} = symbolData;
        indicators.buy = 0;
        //ema
        let {ema10, ema20} = indicators;
        indicators.ema_ok = _.last(ema10) > _.last(ema20);
        let [ema10_pre, ema10_cur] = ema10.slice(-2);
        let [ema20_pre, ema20_cur] = ema20.slice(-2);
        indicators.ema_crossing_up = ema10_pre <= ema20_pre && ema10_cur > ema20_cur;
        indicators.ema_crossing_down = ema10_pre >= ema20_pre && ema10_cur < ema20_cur;
        indicators.ema_crossing = indicators.ema_crossing_up || indicators.ema_crossing_down;
        indicators.ema_distance = distance(_.last(ema10), _.last(ema20));

        indicators.buy += indicators.ema_ok
        && indicators.ema10_trend === 1
        && (indicators.ema_distance > 1 || indicators.ema_crossing_up) ? 1 : 0;
        // indicators.buy += indicators.ema_crossing_up ? 1 : 0;

        //adx
        let {adx, adx_trend, adx_minus_di, adx_plus_di} = indicators;
        let adx_cur = _.last(adx);
        let [minus_di_pre, minus_di_cur] = adx_minus_di.slice(-2);
        let [plus_di_pre, plus_di_cur] = adx_plus_di.slice(-2);
        indicators.adx_di_distance = distance(_.last(adx_plus_di), _.last(adx_minus_di));
        indicators.adx_ok = adx_cur > ADX_REF
            && _.last(adx_plus_di) > _.last(adx_minus_di)
            && indicators.adx_di_distance > 1
            && (indicators.adx_plus_di_trend === 1 || indicators.adx_minus_di_trend === -1);// && adx_trend === 1;

        indicators.buy += indicators.adx_ok && indicators.adx_trend === 1 ? 1 : 0;

        //rsi
        let {rsi} = indicators;
        let rsi_cur = _.last(rsi);

        indicators.buy += rsi_cur < RSI_REF ? 1 : 0;
        symbolData.buy = indicators.buy >= 2;
        if (symbolData.buy) {
            // console.debug(indicators.adx.slice(-2))
            console.debug(symbol, ' buy: ' + indicators.buy,
                'Ema Distance', indicators.ema_distance,
                'Ema Cross UP', indicators.ema_crossing_up,
                'DI Distance', indicators.adx_di_distance,
                'Original Signal: ', symbolData.signal)
        }
    }

}

function distance(pointA, pointB) {
    return +((pointA - pointB) / pointB * 100).toFixed(2)
}

appEmitter.on('tv:signals', (data) => {
    _.each(data, (symbolData) => {
        let trySymbol = checkIndicators(symbolData);
        if (trySymbol) {
            trySymbol.trading = true
            setImmediate(() => appEmitter.emit('analyse:try_trade', trySymbol));
        }
    })

});