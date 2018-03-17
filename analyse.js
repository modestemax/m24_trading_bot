const _ = require('lodash');
const sorted = require('is-sorted');

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
                    oldIndicators[indKey] = oldIndicators[indKey].concat(indValues).slice(-10)
                    lastSymbolData.indicators[indKey + '_trendingUp'] = lastValue < newValue;
                    lastSymbolData.indicators[indKey + '_trendingDown'] = lastValue > newValue;
                }
                return oldIndicators;
            }, lastSymbolData.indicators);
        }

        // if (lastSymbolData.indicators.ema10.length > 4) {
        _.extend(lastSymbolData, _.omit(sdata, 'indicators'));
        lastSymbolData.checkStatus = getIndicatorStatusChecker(lastSymbolData)
        lastSymbolData.checkStatus();
        // }
        if (lastSymbolData.buy || lastSymbolData.trading) {
            return lastSymbolData
        }
    }
})();

function getIndicatorStatusChecker(symbolData) {
    const ADX_REF = 30, RSI_REF = 30, EMA_DISTANCE_REF = .2,
        ADX_DI_DISTANCE_REF = 1, BUY_POSITION = 2, MIN_LENGTH = 2;
    return function () {
        let {indicators, symbol} = symbolData;
        indicators.buy = 0;

        checkEmaStatus();
        checkAdxStatus();
        checkRsiStatus();

        symbolData.buy = indicators.buy >= BUY_POSITION;

        if (symbolData.buy && 0) {
            // console.debug(indicators.adx.slice(-2))
            console.debug(symbol, ' buy: ' + indicators.buy,
                'Ema Distance', indicators.ema_distance,
                'Ema Cross UP', indicators.ema_crossing_up,
                'DI Distance', indicators.adx_di_distance,
                'Original Signal: ', symbolData.signalString)
        }

        function checkEmaStatus() {
            let {ema10, ema20} = indicators;

            if (_.min([ema10.length, ema20.length]) < MIN_LENGTH) return;

            let [ema10_pre, ema10_cur] = ema10.slice(-2);
            let [ema20_pre, ema20_cur] = ema20.slice(-2);

            indicators.ema_crossing_up = ema10_pre <= ema20_pre && ema10_cur > ema20_cur;
            indicators.ema_crossing_down = ema10_pre >= ema20_pre && ema10_cur < ema20_cur;
            indicators.ema_crossing = indicators.ema_crossing_up || indicators.ema_crossing_down;
            indicators.ema_distance = distance(ema10_cur, ema20_cur);

            indicators.ema_ok = ema10_cur > ema20_cur
                && indicators.ema10_trendingUp
                && isSorted(indicators.ema10)
                && indicators.ema20_trendingUp
                && isSorted(indicators.ema20)
                && (indicators.ema_distance > EMA_DISTANCE_REF || indicators.ema_crossing_up);

            indicators.buy += +indicators.ema_ok;
        }

        function checkAdxStatus() {
            let {adx, adx_trendingUp, adx_minus_di_trendingDown, adx_plus_di_trendingUp, adx_minus_di, adx_plus_di} = indicators;
            let [minus_di_pre, minus_di_cur] = adx_minus_di.slice(-2);
            let [plus_di_pre, plus_di_cur] = adx_plus_di.slice(-2);

            if (_.min([adx.length, adx_minus_di.length, adx_plus_di.length]) < MIN_LENGTH) return;

            indicators.adx_di_distance = distance(plus_di_cur, minus_di_cur);
            indicators.adx_ok = _.last(adx) > ADX_REF
                && plus_di_cur > minus_di_cur
                && indicators.adx_di_distance > ADX_DI_DISTANCE_REF
                && adx_plus_di_trendingUp
                && adx_minus_di_trendingDown
                && adx_trendingUp
                && isSorted(indicators.adx)
                && isSorted(indicators.adx_plus_di)
                && isSorted(indicators.adx_minus_di, true)

            indicators.buy += +indicators.adx_ok;
        }

        function checkRsiStatus() {
            let {rsi} = indicators;
            let rsi_cur = _.last(rsi);
            indicators.buy += +(rsi_cur < RSI_REF);
        }

        function isSorted(list, reverse) {
            let slist = _.slice(list, -MIN_LENGTH);
            return sorted(slist, reverse ? (a, b) => b - a : void 0)
        }

    }

}

function distance(pointA, pointB) {
    return +((pointA - pointB) / pointB * 100).toFixed(2)
}


const allTickers = {}
appEmitter.on('exchange:tickers', (exchange, tickers) => {
    //debugger
    allTickers[exchange] = allTickers[exchange] || {};
    _.extend(allTickers[exchange], tickers);
});
appEmitter.on('tv:signals', (data) => {
    const CHANGE_24H = 2;
    _.each(data, (symbolData) => {
        let {exchange, symbol} = symbolData;
        let tickers = allTickers[exchange];
        if (tickers) {
            let ticker = tickers[symbol];
            if (ticker && ticker.priceChangePercent > CHANGE_24H) {
                let trySymbol = checkIndicators(symbolData);
                if (trySymbol && !trySymbol.trading) {
                    trySymbol.trading = true;
                    setImmediate(() => appEmitter.emit('analyse:try_trade', trySymbol));
                }
            }
        }

    })

});

appEmitter.on('tv:signals', (data) => {
    _.each(data, (symbolData) => {
        let trySymbol = checkIndicators(symbolData);
        if (trySymbol) {
            if (trySymbol.trading) {
                if (trySymbol.indicators.buy) {
                    setImmediate(() => appEmitter.emit('analyse:try_trade', trySymbol));
                } else {
                    setImmediate(() => appEmitter.emit('analyse:try_trade', trySymbol));
                    debugger
                    console.debug('<--' + trySymbol.symbol)
                }
            }
        }

    })
});