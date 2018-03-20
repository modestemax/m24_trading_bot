const debug = require('debug')('analyse');
const _ = require('lodash');
const sorted = require('is-sorted');
const {getChangePercent, updatePrice} = require('./utils');

const goodToBuy = function () {
    let markets = {};
    const MAX_LENGTH = 10;
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
                    prevIndicators[indKey] = prevIndicators[indKey].concat(indValues).slice(-MAX_LENGTH)
                    prevMarket.indicators[indKey + '_trendingUp'] = lastValue < newValue;
                    prevMarket.indicators[indKey + '_trendingDown'] = lastValue > newValue;
                }
                return prevIndicators;
            }, prevMarket.indicators);
        }

        // if (lastSymbolData.indicators.ema10.length > 4) {
        let lastMarket = _.extend(prevMarket, _.omit(market, 'indicators'));
        checkIndicatorStatus(lastMarket);
        // }
        if (lastMarket.buy) {
            return lastMarket
        }
    }
}();

const checkIndicatorStatus = function () {
    const ADX_REF = 30, RSI_REF = 30, EMA_DISTANCE_REF = .2,
        ADX_DI_DISTANCE_REF = 1, BUY_POSITION = 2,
        // MIN_LENGTH = 2
        MIN_LENGTH = 5
    ;
    return function (market) {
        let {indicators, symbol} = market;
        indicators.buy = 0;

        checkEmaStatus();
        checkAdxStatus();
        checkRsiStatus();

        market.buy = indicators.buy >= BUY_POSITION;
        // market.buy = market.symbol == 'DLT/BTC' || indicators.buy >= BUY_POSITION;//todo for test

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
            let [ema10_0,] = ema10;
            let [ema20_0,] = ema20;

            indicators.ema_crossing_up = ema10_pre <= ema20_pre && ema10_cur > ema20_cur;
            indicators.ema_crossing_down = ema10_pre >= ema20_pre && ema10_cur < ema20_cur;
            indicators.ema_crossing = indicators.ema_crossing_up || indicators.ema_crossing_down;
            indicators.ema_distance = distance(ema10_cur, ema20_cur);
            indicators.ema_0_distance = distance(ema10_0, ema20_0);

            indicators.ema_ok = ema10_cur > ema20_cur
                && indicators.ema10_trendingUp
                && isSorted(indicators.ema10)
                && indicators.ema20_trendingUp
                && isSorted(indicators.ema20)
                // && (indicators.ema_distance > EMA_DISTANCE_REF || indicators.ema_crossing_up)
                && indicators.ema_distance > EMA_DISTANCE_REF
                && indicators.ema_distance >= indicators.ema_0_distance;

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
            let trendingUp = getChangePercent(_.head(list), _.last(list));
            trendingUp = reverse ? trendingUp < 0 : trendingUp > 0;
            return sorted(slist, reverse ? (a, b) => b - a : void 0)
                || trendingUp;
        }

    }

}();

function distance(pointA, pointB) {
    return +((pointA - pointB) / pointB * 100).toFixed(2)
}

function listenToEvents() {

    const symbolsDta = {};
    appEmitter.on('exchange:ticker', ({ticker}) => {
        addSymbolData({symbol: ticker.symbol, prop: 'ticker', data: ticker});
        // checkSignal(symbolsDta[ticker.symbol])
    });
    appEmitter.on('tv:signals_long_timeframe', ({markets}) => {
        _.forEach(markets, market => {
            addSymbolData({symbol: market.symbol, prop: 'longSignal', data: market});
            // checkSignal(symbolsDta[market.symbol])
        });
    });
    appEmitter.on('tv:signals', ({markets}) => {
        _.forEach(markets, market => {
            addSymbolData({symbol: market.symbol, prop: 'signal', data: market});
            checkSignal(symbolsDta[market.symbol])
        });
    });

    function addSymbolData({symbol, prop, data}) {
        let tickerData = symbolsDta[symbol] = symbolsDta[symbol] || {};
        tickerData[prop] = data;
    }

    function checkSignal({ticker, signal, longSignal}) {
        setImmediate(() => {
            const CHANGE_24H_FOR_TRADE = 2;
            const CHANGE_LONG_TIMEFRAME_FOR_TRADE = 2;
            if (ticker && signal && longSignal) {
                if (ticker.percentage > CHANGE_24H_FOR_TRADE && longSignal.changePercent > CHANGE_LONG_TIMEFRAME_FOR_TRADE) {
                    let marketBuy = goodToBuy(signal);
                    if (marketBuy) {
                        setImmediate(() => appEmitter.emit('analyse:try_trade', {market: marketBuy, ticker}));
                    }
                }
            }
        })

    }
}

listenToEvents();