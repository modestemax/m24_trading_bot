const _ = require('lodash');
const moment = require('moment');

let runningTrades = {};


appEmitter.on('analyse:buy', (data) => {

    trade({data, signal: 'buy', runningTrades})

});
appEmitter.on('analyse:sell', (data) => {

    trade({data, signal: 'sell', runningTrades})

});


function trade({data, signal, runningTrades}) {
    console.debug(`\n` + signal);
    _.each(data, (symbolData, symbol) => {

        switch (signal) {
            case 'buy':
                runningTrades[symbol] = runningTrades[symbol] || symbolData;
                tradeBuy({lastData: runningTrades[symbol], newData: symbolData});
                if (runningTrades[symbol].gainOrLoss < 2) {
                    delete runningTrades[symbol];
                    console.debug('leaving ' + symbol);
                } else if () {
                    console.debug('going real trade ' + symbol);
                }
                break;
            case 'sell':
                if (runningTrades[symbol]) {
                    tradeSell({lastData: runningTrades[symbol], newData: symbolData});
                    delete runningTrades[symbol];
                }
        }
    })
}

function tradeBuy({lastData, newData}) {
    if (!(lastData.tradeStarted || lastData.tradeStarting)) {
        lastData.tradeStarting = true;
        // appEmitter.once('exchange:bought:' + newData.symbol, (buyOrder) => {
        lastData.tradeStarted = true;
        lastData.trade = _.extend({time: new Date()/*, buyOrder*/}, newData);
        // });
        // appEmitter.emit('exchange:buy', newData)
    } else if (lastData.tradeStarted) {
        let lastPrice = newData.close;
        let buyPrice = lastData.trade.close;
        if (lastPrice !== buyPrice) {
            let buyTime = lastData.trade.time.getTime();
            let now = new Date().getTime();
            let gainOrLoss = getChangePercent(buyPrice, lastPrice);
            let duration = moment.duration(now - buyTime).humanize();
            _.extend(lastData, newData);
            _.extend(lastData.trade, {gainOrLoss, duration});
            // stopLossOrTakeProfit(symbolData);
            console.debug(`${lastData.symbol} buy when ${lastData.trade.changePercent} now ${newData.changePercent} in [${lastData.trade.duration}] change ${lastData.trade.gainOrLoss}`)
        }
    }
}

function tradeSell({lastData, newData}) {
    if (lastData.tradeStarted && !(lastData.tradeEnded || lastData.tradeEnding)) {
        lastData.tradeEnding = true
        // appEmitter.once('exchange:sold:' + lastData.symbol, (sellOrder) => {
        let now = new Date().getTime();
        lastData.tradeEnded = true;
        let buyPrice = lastData.trade.close;
        let buyTime = lastData.trade.time.getTime();
        let sellPrice = sellOrder.price;
        let gainOrLoss = getChangePercent(buyPrice, sellPrice, {buyTime});
        let duration = moment.duration(now - buyTime).humanize();
        _.extend(lastData, newData);
        _.extend(lastData.trade, {gainOrLoss, duration/*, sellOrder*/});
        console.debug(`${lastData.symbol} buy when ${lastData.trade.changePercent} now ${newData.changePercent} in [${lastData.trade.duration}] finished at ${lastData.trade.gainOrLoss}`)
        // });
        // appEmitter.emit('exchange:sell', newData)
    }
}

function getChangePercent(buyPrice, sellPrice) {
    let gain = (sellPrice - buyPrice) / buyPrice * 100;
    return +(gain.toFixed(2));
}