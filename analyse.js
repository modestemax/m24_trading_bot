const debug = require('debug')('analyse');
const _ = require('lodash');
const sorted = require('is-sorted');
const {getChangePercent, updatePrice} = require('./utils');

const goodToBuy = function () {
    let markets = {};
    const MAX_LENGTH = 10;
    return function (market) {
        let {symbol} = market;
        let prevMarket = markets[symbol] || market;

        let lastMarket = markets[symbol] = _.extend(prevMarket, _.omit(market, 'indicators'));
        prevMarket.indicators = _.reduce(market.indicators, (prevIndicators, indValue, indKey) => {
            if (!_.isArray(prevIndicators[indKey])) {
                prevIndicators[indKey] = [{value: prevIndicators[indKey], time: market.time}];
            }
            let {value: lastValue} = _.last(prevIndicators[indKey]);
            let newValue = indValue;

            if (lastValue !== newValue) {
                prevIndicators[indKey] = prevIndicators[indKey]
                    .concat({
                        value: indValue,
                        time: market.time
                    }).slice(-MAX_LENGTH);
                prevMarket.indicators[indKey + '_trendingUp'] = lastValue < newValue;
                prevMarket.indicators[indKey + '_trendingDown'] = lastValue > newValue;
            }
            return prevIndicators;
        }, prevMarket.indicators);

        checkIndicatorStatus(lastMarket);

        // if (lastMarket.indicators.ema_ok && lastMarket.indicators.ema_angle) {
        //     let angle = `${symbol} angle ${lastMarket.indicators.ema_angle.toFixed(2)}`;
        //     log(angle, debug);
        // }
        if (lastMarket.buy) {
            return lastMarket
        }
    }
}();

const checkIndicatorStatus = function () {
    const ADX_REF = 30, RSI_REF = 30, EMA_DISTANCE_REF = .2, MACD_DISTANCE_REF = .2, AROON_DISTANCE_REF = 50,
        ADX_DI_DISTANCE_REF = 5, MIN_BUY_LEVEL = 4,
        MIN_LENGTH = 3
        // MIN_LENGTH = 5
    ;
    return function (market) {
        let {indicators, symbol} = market;
        indicators.buyLevel = 0;

        checkEmaStatus();
        checkMacdStatus();
        checkAroonStatus();
        checkAdxStatus();
        checkRsiStatus();

        market.buy = indicators.buyLevel >= MIN_BUY_LEVEL;
        // market.buy = market.symbol == 'DLT/BTC' || indicators.buyLevel >= BUY_POSITION;//todo for test

        // if (market.buy && 0) {
        //     // console.debug(indicators.adx.slice(-2))
        //     console.debug(symbol, ' buy: ' + indicators.buyLevel,
        //         'Ema Distance', indicators.ema_distance,
        //         'Ema Cross UP', indicators.ema_crossing_up,
        //         'DI Distance', indicators.adx_di_distance,
        //         'Original Signal: ', market.signalString)
        // }

        function checkEmaStatus() {
            let {ema10, ema20} = indicators;

            if (_.min([ema10.length, ema20.length]) < MIN_LENGTH) return;

            let [{value: ema10_pre}, {value: ema10_cur}] = ema10.slice(-2);
            let [{value: ema20_pre}, {value: ema20_cur}] = ema20.slice(-2);
            let [{value: ema10_0},] = ema10;
            let [{value: ema20_0},] = ema20;

            indicators.ema_crossing_up = ema10_pre <= ema20_pre && ema10_cur > ema20_cur;
            indicators.ema_crossing_down = ema10_pre >= ema20_pre && ema10_cur < ema20_cur;
            indicators.ema_crossing = indicators.ema_crossing_up || indicators.ema_crossing_down;
            indicators.ema_distance = distance(ema10_cur, ema20_cur);
            indicators.ema_0_distance = distance(ema10_0, ema20_0);
            // indicators.ema_angle = getEmaAngle();
            indicators.ema_ok = ema10_cur > ema20_cur
                && indicators.ema10_trendingUp
                && isSorted(values(indicators.ema10))
                && indicators.ema20_trendingUp
                && isSorted(values(indicators.ema20))
                // && (indicators.ema_distance > EMA_DISTANCE_REF || indicators.ema_crossing_up)
                && indicators.ema_distance > EMA_DISTANCE_REF
                && indicators.ema_distance >= indicators.ema_0_distance;

            indicators.buyLevel += +indicators.ema_ok;


            function getEmaAngle() {
                let ema10_0 = _.first(ema10);
                let ema10_1 = _.last(ema10);
                let ema20_0 = _.first(ema20);
                let ema20_1 = _.last(ema20);
                let ema10y = 10e8 * (ema10_1.value - ema10_0.value);
                let ema10x = (1 / 1e3) * (ema10_1.time - ema10_0.time);
                let ema20y = 10e8 * (ema20_1.value - ema20_0.value);
                let ema20x = (1 / 1e3) * (ema20_1.time - ema20_0.time);
                let ema10_angle = toDegre(Math.acos(ema10x / Math.sqrt(ema10x ** 2 + ema10y ** 2)))
                let ema20_angle = toDegre(Math.acos(ema20x / Math.sqrt(ema20x ** 2 + ema20y ** 2)))
                let ema_angle = ema10_angle - ema20_angle;
                return ema_angle;

                function toDegre(num) {
                    return num * 180 / Math.PI
                }
            }

        }

        function checkMacdStatus() {
            //macd >macd_signal
            let {macd, macd_signal} = indicators;

            if (_.min([macd.length, macd_signal.length]) < MIN_LENGTH) return;

            let [{value: macd_pre}, {value: macd_cur}] = macd.slice(-2);
            let [{value: macd_signal_pre}, {value: macd_signal_cur}] = macd_signal.slice(-2);
            let [{value: macd_0},] = macd;
            let [{value: macd_signal_0},] = macd_signal;

            indicators.macd_crossing_up = macd_pre <= macd_signal_pre && macd_cur > macd_signal_cur;
            indicators.macd_crossing_down = macd_pre >= macd_signal_pre && macd_cur < macd_signal_cur;
            indicators.macd_crossing = indicators.macd_crossing_up || indicators.macd_crossing_down;
            indicators.macd_distance = distance(macd_cur, macd_signal_cur);
            indicators.macd_0_distance = distance(macd_0, macd_signal_0);
            // indicators.macd_angle = getmacdAngle();
            indicators.macd_ok = macd_cur > macd_signal_cur
                && indicators.macd_trendingUp
                && isSorted(values(indicators.macd))
                && indicators.macd_signal_trendingUp
                && isSorted(values(indicators.macd_signal))
                // && (indicators.macd_distance > macd_DISTANCE_REF || indicators.macd_crossing_up)
                && indicators.macd_distance > MACD_DISTANCE_REF
                && indicators.macd_distance >= indicators.macd_0_distance;

            indicators.buyLevel += +indicators.macd_ok;


        }

        function checkAroonStatus() {
            let {aroon_up, aroon_down} = indicators;

            if (_.min([aroon_up.length, aroon_down.length]) < 1) return;

            let {value: aroon_up_cur} = _.last(aroon_up);
            let {value: aroon_down_cur} = _.last(aroon_down);

            indicators.aroon_distance = aroon_up_cur - aroon_down_cur;

            indicators.aroon_ok = aroon_up_cur > aroon_down_cur
                && aroon_up_cur >= 70
                && aroon_down_cur < 30
                && indicators.aroon_distance >= AROON_DISTANCE_REF;

            indicators.buyLevel += +indicators.aroon_ok;
        }

        function checkAdxStatus() {
            let {adx, adx_trendingUp, adx_minus_di_trendingDown, adx_plus_di_trendingUp, adx_minus_di, adx_plus_di} = indicators;

            if (_.min([adx.length, adx_minus_di.length, adx_plus_di.length]) < MIN_LENGTH) return;

            let [{value: minus_di_pre}, {value: minus_di_cur}] = adx_minus_di.slice(-2);
            let [{value: plus_di_pre}, {value: plus_di_cur}] = adx_plus_di.slice(-2);

            indicators.adx_di_distance = plus_di_cur - minus_di_cur;
            indicators.adx_ok = _.last(adx).value > ADX_REF
                && plus_di_cur > minus_di_cur
                && indicators.adx_di_distance > ADX_DI_DISTANCE_REF
                && adx_plus_di_trendingUp
                && adx_minus_di_trendingDown
                && adx_trendingUp
                && isSorted(values(indicators.adx))
                && isSorted(values(indicators.adx_plus_di))
                && isSorted(values(indicators.adx_minus_di), {reverse: true})

            indicators.buyLevel += +indicators.adx_ok;
        }

        function checkRsiStatus() {
            let {rsi} = indicators;
            let {value: rsi_cur} = _.last(rsi);
            indicators.buyLevel += +(rsi_cur < RSI_REF);
        }

        function isSorted(list, {reverse = false} = {}) {
            let slist = _.slice(list, -MIN_LENGTH);
            let trendingUp = getChangePercent(_.head(list), _.last(list));
            trendingUp = reverse ? trendingUp < 0 : trendingUp > 0;
            return sorted(slist, reverse ? (a, b) => b - a : void 0)
                || trendingUp;
        }

        function values(list) {
            return _.map(list, l => l.value)
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