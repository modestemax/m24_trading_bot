const _ = require('lodash');
const Settings = require('pd-redis-model')(appKey + 'Settings');
const Trade = require('pd-redis-model')(appKey + 'Trade');
const OldTrade = require('pd-redis-model')(appKey + 'OldTrade');
const TradeRatio = require('pd-redis-model')(appKey + 'TradeRatio');

Object.assign(global, {Model: {Settings, Trade, OldTrade, TradeRatio}});
Settings.current = null;
Settings.load = async function () {
    if (!Settings.current) {
        try {
            let settings = await Settings.range({
                latest: Date.now(), //* the ending time point of list
                earliest: 0,                   //* the starting time point of list
                limit: [0, 1],
            });
            Settings.current = _.first(settings) || {}
            return Settings.current;
        } catch (e) {
            log(e);
            process.exit(1);
        }
    } else {
        return Settings.current;
    }
};

Settings.updateSettings = async function ({settings}) {
    try {
        if (settings) {
            let settings0 = await Settings.load();
            settings0 = _.extend(settings0, settings0);
            await Settings.modify(settings0);
            Settings.current = settings0;
        }
    }
    catch (e) {
        emitException(e);
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
        emitException(e);
    }
};

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
        emitException(e);
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
        emitException(e);
    }
}

TradeRatio.load = async function ({symbol}) {
    try {
        const {TRADE_RATIO} = await Settings.load();
        let tradeRatio = await TradeRatio.range({
            latest: Date.now(), //* the ending time point of list
            earliest: 0,                   //* the starting time point of list
            limit: [0, 1],
        });
        if (!tradeRatio.length) {
            let sid = await TradeRatio.create({});
            tradeRatio = {'pd-sid': sid};
        } else {
            tradeRatio = _.first(tradeRatio);
        }
        return symbol ? tradeRatio[symbol] || TRADE_RATIO : tradeRatio;
    } catch (e) {
        emitException(e);
    }
};


TradeRatio.updateTradeRatio = async function ({symbol, ratio}) {
    try {
        if (symbol && ratio && !isNaN(+ratio)) {
            let tradeRatio = await TradeRatio.load();
            tradeRatio[symbol] = ratio;
            await TradeRatio.modify(tradeRatio);
        }
    }
    catch (e) {
        emitException(e);
    }
}

appEmitter.on('trade:new_trade', addTrade);
appEmitter.on('trade:end_trade', delTrade);