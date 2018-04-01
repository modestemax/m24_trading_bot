const _ = require('lodash');
const hex = require('text-hex');
const {FEE_CUR, QUOTE_CUR} = env;

// Extend the string type to allow converting to hex for quick access.
String.prototype.toHex = function () {
    let color = hex(this);
    return color.substring(1);
};
String.prototype.toUniqHex = function () {
    return this + (new Date().getTime().toString()).toHex();
};

const exchange = global.exchange;


const fn = module.exports = {

    getChangePercent(buyPrice, sellPrice) {
        return (sellPrice - buyPrice) / buyPrice * 100;
        // let gain = (sellPrice - buyPrice) / buyPrice * 100;
        // return +(gain.toFixed(2));
    },
    updatePrice({price, percent}) {
        return price * (1 + percent / 100)
    },
    isTradable({baseCur, pair}) {
        //baseCur is not QUOTE_CUR and not FEE_CUR
        return baseCur ? !new RegExp(QUOTE_CUR + (FEE_CUR ? '|' + FEE_CUR : ''), 'i').test(baseCur)
            : pair ? !(new RegExp(fn.getPair({baseCur: FEE_CUR}), 'i').test(pair))
                : null
    },
    getTradablePairs(pairs) {
        return pairs.filter(pair => fn.isTradable({pair}))
    },

    getPair({symbol, baseCur}) {
        return symbol ? fn.getMarket({symbol}).id
            : baseCur ?
                (_.find(exchange.markets, (market) => market.baseId.toUpperCase() === baseCur.toUpperCase()) || {}).id
                : null
    }
    ,
    getSymbol({pair}) {
        let market= fn.getMarket({pair});
        return market && market.symbol
    },
    getQuotePairs() {
        return _.keys(exchange.marketsById)
            .filter(id => (new RegExp(QUOTE_CUR, 'i')).test(id))
    },

    getMarket({baseCur, symbol, pair}) {
        return baseCur ? exchange.marketsById[fn.getPair({baseCur})]
            : symbol ? exchange.market(symbol)
                : pair ? exchange.marketsById[pair.toUpperCase()]
                    : null;
    },

    getBaseCur({symbol}) {
        let market = exchange.market(symbol);
        return market.baseId;
    },

    async getTotalBaseCurBalance({symbol}) {
        return fn.getBalance({cur: fn.getBaseCur({symbol}), part: 'total'});
    },

    async getFreeBalance({cur}) {
        return fn.getBalance({cur, part: 'free'});
    },

    async getBalance({cur, part}) {
        return (await fn.getBalances()) [cur.toUpperCase()][part];
    },

    async getTicker({symbol}) {
        return new Promise((resolve) => {
            appEmitter.once('exchange:ticker:' + symbol, ({ticker}) => {
                resolve(ticker);
            });
        });
    },
    async getBalances() {
        return new Promise((resolve) => {
            appEmitter.once('exchange:balances', ({balances}) => {
                resolve(balances);
            });
            appEmitter.emit('app:get_balances');
        });
    },
    async getAllPrices() {
        return new Promise((resolve) => {
            appEmitter.once('exchange:prices', ({prices}) => {
                resolve(prices);
            });
            appEmitter.emit('app:get_prices');
        });
    },

    async isCurrentlyTrading({symbol}) {
        return new Promise((resolve, reject) => {
            appEmitter.once('trade:symbols', ({symbols}) => {
                resolve(symbols[symbol]);
            });
            appEmitter.emit('app:get_currently_tradings_symbols')
        })
    },
    fetchTicker({symbol}) {
        appEmitter.emit('app:fetch_ticker', {symbol});
    },
    fetchDepth({symbol}) {
        appEmitter.emit('app:fetch_depth', {symbol});
    },
    fetchLongTrend() {
        appEmitter.emit('app:fetch_long_trend');
    },
    getLastBuyOrder(orders) {
        return _(orders).filter(orders, o => /BUY/i.test(o.side))
            .sortBy([o => new Date(o.datetime)])
            .last()
            .value()
    },

    getLastStopLossOrder(orders) {
        return _(orders).filter(orders, ({side, status, type}) => /SELL/i.test(side) && /OPEN/i.test(status) && /STOP_LOSS_LIMIT/i.test(type))
            .sortBy([o => new Date(o.datetime)])
            .last()
            .value()
    }
};
