const _ = require('lodash');
const sorted = require('is-sorted');

const isGoodToBuy = function () {
    let markets = {};
    return function (market) {
        let {symbol} = market;
        let prevMarket = markets[symbol];
        if (!prevMarket) {
            prevMarket = markets[symbol] = market;
        } else {
            prevMarket.indicators = _.reduce(market.indicators, (prevIndicators, indValues, indKey) => {
                let lastValue = _.last(prevIndicators[indKey]);
                let newValue = _.last(indValues);

                if (lastValue !== newValue) {
                    prevIndicators[indKey] = prevIndicators[indKey].concat(indValues).slice(-10)
                    prevMarket.indicators[indKey + '_trendingUp'] = lastValue < newValue;
                    prevMarket.indicators[indKey + '_trendingDown'] = lastValue > newValue;
                }
                return prevIndicators;
            }, prevMarket.indicators);
        }

        // if (lastSymbolData.indicators.ema10.length > 4) {
        _.extend(prevMarket, _.omit(market, 'indicators'));
        getIndicatorStatusChecker(prevMarket)
        // }
        if (prevMarket.buy) {
            return prevMarket
        }
    }
}();

const getIndicatorStatusChecker = function () {
    const ADX_REF = 30, RSI_REF = 30, EMA_DISTANCE_REF = .2,
        ADX_DI_DISTANCE_REF = 1, BUY_POSITION = 2, MIN_LENGTH = 2;
    return function (market) {
        let {indicators, symbol} = market;
        indicators.buy = 0;

        checkEmaStatus();
        checkAdxStatus();
        checkRsiStatus();

        market.buy = indicators.buy >= BUY_POSITION;

        // if (market.buy && 0) {
        //     // console.debug(indicators.adx.slice(-2))
        //     console.debug(symbol, ' buy: ' + indicators.buy,
        //         'Ema Distance', indicators.ema_distance,
        //         'Ema Cross UP', indicators.ema_crossing_up,
        //         'DI Distance', indicators.adx_di_distance,
        //         'Original Signal: ', market.signalString)
        // }

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

}();

function distance(pointA, pointB) {
    return +((pointA - pointB) / pointB * 100).toFixed(2)
}

function listenToEvents() {

    const allTickers = {}
    appEmitter.on('exchange:tickers', (tickers) => {
        //debugger
        _.extend(allTickers, tickers);
    });
    appEmitter.on('tv:signals', (markets) => {
        const CHANGE_24H_FOR_TRADE = 2;
        _.each(markets, (market) => {
            let {symbol} = market;
            let ticker = allTickers[symbol];
            if (ticker && ticker.priceChangePercent > CHANGE_24H_FOR_TRADE) {
                if (isGoodToBuy(market)) {
                    setImmediate(() => appEmitter.emit('analyse:try_trade', market));
                }
            }

        })

    });
}

listenToEvents();