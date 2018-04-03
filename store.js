const _ = require('lodash');
const Settings = require('pd-redis-model')(appKey + 'Settings');
const Trade = require('pd-redis-model')(appKey + 'Trade');
const OldTrade = require('pd-redis-model')(appKey + 'OldTrade');

Object.assign(global, {Model: {Settings, Trade, OldTrade}});

Settings.load = async function () {
    try {
        let settings = await Settings.range({
            latest: Date.now(), //* the ending time point of list
            earliest: 0,                   //* the starting time point of list
            limit: [0, 1],
        });
        return _.first(settings) || {}
    } catch (e) {
        log(e);
        process.exit(1);
    }
}

Trade.load = async function ({symbol}) {
    try {
        let trades = await Trade.range({
            latest: Date.now(), //* the ending time point of list
            earliest: 0,                   //* the starting time point of list
            limit: [0, 150],
        });
        return _.find(trades, (t) => t.symbol === symbol)
    } catch (e) {
        log(e);
    }
}

async function addTrade({trade}) {
    try {
        if (trade) {
            let oldTrade = await Trade.load({symbol: trade.symbol});
            if (oldTrade) {
                await Trade.remove(oldTrade['pd-sid']);
            }
            await Trade.create(trade);
        }
    } catch (e) {
        log(e);
    }
}

async function delTrade({symbol, trade}) {
    try {
        if (trade || symbol) {
            symbol = symbol || trade.symbol;
            let oldTrade = await Trade.load({symbol});
            if (oldTrade) {
                await  Trade.remove(oldTrade['pd-sid']);
                await OldTrade.create(trade || oldTrade);
            }
        }
    } catch (e) {
        log(e);
    }
}

appEmitter.on('trade:new_trade', addTrade);
appEmitter.on('trade:end_trade', delTrade)