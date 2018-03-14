const _ = require('lodash');
const updateIndicator = (() => {
    let newData;
    return (data) => {
        if (!newData) {
            return newData = data
        } else {
           // debugger
            return _.mapValues(data, (sdata, symbol) => {
                sdata.indicators = _.mapValues(sdata.indicators, (indValues, indKey) => {
                    return newData[symbol].indicators[indKey].concat(indValues).slice(-5)
                });
                return sdata;
            })
        }
    }
})();

function goodToBuy({data, rateMin, rateMax} = {}, signalStrength = 0) {
    rateMin = rateMin || -Infinity;
    rateMax = rateMax || Infinity;
    return _.reduce(data, (buy, data) => {
        if (data.signal === 'buy' && data.signalStrength >= signalStrength) {
            if (rateMin <= data.changePercent && data.changePercent < rateMax) {
                buy[data.symbol] = data;
            }
        }
        return buy;
    }, {})
}

function goodToSell({data, rateMin, rateMax} = {}) {
    rateMin = rateMin || -Infinity;
    rateMax = rateMax || Infinity;
    return _.reduce(data, (buy, data) => {
        if (data.signal === 'sell') {
            if (rateMin <= data.changePercent && data.changePercent < rateMax) {
                buy[data.symbol] = data;
            }
        }
        return buy;
    }, {})
}

appEmitter.on('tv:signals', (data) => {
    let newData = updateIndicator(data);
    let buy = goodToBuy({data: newData, rateMin: -1e3, rateMax: 1e3})
    appEmitter.emit('analyse:buy', buy);
    let sell = goodToSell({data: newData/*, rateMin: 4, rateMax: 1e3*/})
    appEmitter.emit('analyse:sell', sell);
});