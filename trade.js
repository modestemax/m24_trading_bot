const _ = require('lodash');
const moment = require('moment');


appEmitter.on('analyse:try_trade', (symbolData) => {

    tryTrade({symbolData})

});


const tryTrade = function () {
    let tryingSymbols = {}, realSymbols = {};
    return function ({symbolData}) {
        // console.log('\n=========================\n');
        let {symbol} = symbolData;
        let trySymbol = tryingSymbols[symbol];
        if (!trySymbol) {
            trySymbol = tryingSymbols[symbol] = {start: symbolData};
            trySymbol.startedAt = new Date();
            trySymbol.buyPrice = symbolData.close;
            trySymbol.gainOrLoss = 0;
            trySymbol.realTrade = realSymbols[symbol];
        }

        let lastPrice = symbolData.close;
        let buyPrice = trySymbol.buyPrice;
        let buyTime = trySymbol.startedAt.getTime();
        let now = new Date().getTime();
        trySymbol.duration = moment.duration(now - buyTime).humanize();
        trySymbol.changeDuration = trySymbol.changeDuration || trySymbol.duration;
        trySymbol.maxGainOrLoss = trySymbol.maxGainOrLoss || trySymbol.gainOrLoss;

        if (lastPrice !== buyPrice) {
            trySymbol.gainOrLoss = getChangePercent(buyPrice, lastPrice);
            trySymbol.maxGainOrLoss = Math.max(trySymbol.maxGainOrLoss, trySymbol.gainOrLoss)
            trySymbol.changeDuration = moment.duration(now - buyTime).humanize();
        }

        _.extend(trySymbol, symbolData);

        if (!trySymbol.realTrade) {
            if (trySymbol.gainOrLoss < -2) {
                delete tryingSymbols[symbol];
                console.debug('leaving ' + symbol);
                return
            }
            if (trySymbol.gainOrLoss > 2) {
                realSymbols[symbol] = true;
                delete tryingSymbols[symbol];
                console.debug('going real trade ' + symbol);
                return;
            }
        }
        if (trySymbol.gainOrLoss > .50 || trySymbol.realTrade) {
            let buyState = trySymbol.start;
            console.debug(`${trySymbol.realTrade ? '\n-->' : ''} ${symbol} buy when ${buyState.changePercent} now ${symbolData.changePercent} in [${trySymbol.duration}] Change ${trySymbol.gainOrLoss} Max Change ${trySymbol.maxGainOrLoss}`)

            if (trySymbol.realTrade) {
                console.debug(`started on ${buyState.signalStrength ? 'Strong' : ''} ${buyState.signal} Signal
Indicators status 
    Startet On ${buyState.indicatorsStatus()}
    Now        ${trySymbol.indicatorsStatus()}\n`)
            }
        }

        if (trySymbol.gainOrLoss < trySymbol.maxGainOrLoss - 2 && trySymbol.realTrade) {
            //stop real trade on stop loss
            (function (trySymbol) {
                setInterval(() => {
                    console.debug(`${trySymbol.symbol} Ended with ${trySymbol.gainOrLoss}
started on ${trySymbol.start.signalStrength ? 'Strong' : ''} ${trySymbol.start.signal} Signal\n`)
                }, 20e3)
            })(trySymbol);

            delete tryingSymbols[symbol];
            delete realSymbols[symbol];
        }
    }
}();
//
//
// function tradeBuy({lastData, newData}) {
//     if (!(lastData.tradeStarted || lastData.tradeStarting)) {
//         lastData.tradeStarting = true;
//         // appEmitter.once('exchange:bought:' + newData.symbol, (buyOrder) => {
//         lastData.tradeStarted = true;
//         lastData.trade = _.extend({time: new Date()/*, buyOrder*/}, newData);
//         // });
//         // appEmitter.emit('exchange:buy', newData)
//     } else if (lastData.tradeStarted) {
//         let lastPrice = newData.close;
//         let buyPrice = lastData.trade.close;
//         if (lastPrice !== buyPrice) {
//             let buyTime = lastData.trade.time.getTime();
//             let now = new Date().getTime();
//             let gainOrLoss = getChangePercent(buyPrice, lastPrice);
//             let duration = moment.duration(now - buyTime).humanize();
//             _.extend(lastData, newData);
//             _.extend(lastData.trade, {gainOrLoss, duration});
//             // stopLossOrTakeProfit(symbolData);
//         }
//     }
// }
//
// function tradeSell({lastData, newData}) {
//     if (lastData.tradeStarted && !(lastData.tradeEnded || lastData.tradeEnding)) {
//         lastData.tradeEnding = true
//         // appEmitter.once('exchange:sold:' + lastData.symbol, (sellOrder) => {
//         let now = new Date().getTime();
//         lastData.tradeEnded = true;
//         let buyPrice = lastData.trade.close;
//         let buyTime = lastData.trade.time.getTime();
//         let sellPrice = sellOrder.price;
//         let gainOrLoss = getChangePercent(buyPrice, sellPrice, {buyTime});
//         let duration = moment.duration(now - buyTime).humanize();
//         _.extend(lastData, newData);
//         _.extend(lastData.trade, {gainOrLoss, duration/*, sellOrder*/});
//         console.debug(`${lastData.symbol} buy when ${lastData.trade.changePercent} now ${newData.changePercent} in [${lastData.trade.duration}] finished at ${lastData.trade.gainOrLoss}`)
//         // });
//         // appEmitter.emit('exchange:sell', newData)
//     }
// }

function getChangePercent(buyPrice, sellPrice) {
    let gain = (sellPrice - buyPrice) / buyPrice * 100;
    return +(gain.toFixed(2));
}