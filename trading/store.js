const _ = require('lodash');
const Settings = require('pd-redis-model')(appKey + 'Settings');
const Trade = require('pd-redis-model')(appKey + 'Trade');
const OldTrade = require('pd-redis-model')(appKey + 'OldTrade');
const TradeRatio = require('pd-redis-model')(appKey + 'TradeRatio');
const SymbolsData = require('pd-redis-model')(appKey + 'SymbolsData');

Object.assign(global, { Model: { Settings, Trade, OldTrade, TradeRatio, SymbolsData } });
Settings.current = null;
Settings.load = async function () {
    if (!Settings.current) {
        try {
            Settings.current = await Settings.findBySid('1');
            if (!Settings.current) {
                let sid = await   Settings.create({  })
                Settings.current = { 'pd-sid': sid };
            }

            return Settings.current;
        } catch (e) {
            log(e);
            process.exit(1);
        }
    } else {
        return Settings.current;
    }
};

Settings.updateSettings = async function ({ settings }) {
    try {
        if (settings) {
            let settings0 = await Settings.load();
            settings0 = _.extend(settings0, settings);
            await Settings.modify(settings0);
            Settings.current = settings0;
        }
    }
    catch (e) {
        emitException(e);
    }
}


Trade.load = async function ({ symbol }) {
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

async function addTrade({ trade }) {
    try {
        if (trade) {
            let oldTrade = await Trade.load({ symbol: trade.symbol });
            if (oldTrade) {
                await Trade.remove(oldTrade['pd-sid']);
            }
            await Trade.create(trade);
        }
    } catch (e) {
        emitException(e);
    }
}

async function delTrade({ symbol, trade }) {
    try {
        if (trade || symbol) {
            symbol = symbol || trade.symbol;
            let oldTrade = await Trade.load({ symbol });
            if (oldTrade) {
                await  Trade.remove(oldTrade['pd-sid']);
                await OldTrade.create(trade || oldTrade);
            }
        }
    } catch (e) {
        emitException(e);
    }
}


TradeRatio.load = async function ({ symbol }) {
    try {
        const { TRADE_RATIO } = await Settings.load();
        let tradeRatio = await TradeRatio.range({
            latest: Date.now(), //* the ending time point of list
            earliest: 0,                   //* the starting time point of list
            limit: [0, 1],
        });
        if (!tradeRatio.length) {
            let sid = await TradeRatio.create({});
            tradeRatio = { 'pd-sid': sid };
        } else {
            tradeRatio = _.first(tradeRatio);
        }
        return symbol ? tradeRatio[symbol] || TRADE_RATIO : tradeRatio;
    } catch (e) {
        emitException(e);
    }
};


TradeRatio.updateTradeRatio = async function ({ symbol, ratio }) {
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

SymbolsData.load = async function ({ starting = false } = {}) {
    try {
        let sData = await SymbolsData.findBySid('1');
        if (!sData) {
            let sid = await   SymbolsData.create({ data: '{}', open: '{}', closed: '{}', time: Date.now() })
            sData = { 'pd-sid': sid };
        }

        if (starting) {
            if (sData && Date.now() - new Date(+sData.time) < 60e3 * 15) {
                try {
                    return {
                        data: JSON.parse(sData.data),
                        open: JSON.parse(sData.open),
                        closed: JSON.parse(sData.closed)
                    }
                } catch (e) {

                }
            } else {
                return null;
            }
        } else {
            return sData;
        }
    } catch (e) {
        log(e);
        process.exit(1);
    }
};

SymbolsData.save = _.throttle(async function ({ data, open, closed }) {
    try {
        // data = data && JSON.stringify(data);
        // open = open && JSON.stringify(open);
        // closed = closed && JSON.stringify(closed);
        // let savedData = await SymbolsData.load();
        //
        // data && (savedData.data = data);
        // open && (savedData.open = open);
        // closed && (savedData.closed = closed);
        // savedData.time = Date.now();
        // SymbolsData.modify(savedData);

    }
    catch
        (e) {
        emitException(e);
    }
}, 30e3 * 5);


appEmitter.on('trade:new_trade', addTrade);
appEmitter.on('trade:end_trade', delTrade);

module.exports = (async () => {
    // let saved = await  SymbolsData.load({ starting: true });
    // // SymbolsData.saved =  {};
    // if (saved) {
    //     // SymbolsData.saved = saved.data || {};
    //     // Trade.open = saved.open || {};
    //     // Trade.closed = saved.closed || {};
    // }
})();
