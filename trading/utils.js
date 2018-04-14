const _ = require('lodash');
const hex = require('text-hex');
const { NO_TRADE_CUR, QUOTE_CUR, TIMEFRAME, EXCHANGE } = env;

// Extend the string type to allow converting to hex for quick access.
String.prototype.toHex = function () {
    let color = hex(this);
    return color.substring(1);
};
String.prototype.toUniqHex = function () {
    return this + (new Date().getTime().toString()).toHex();
};

let exchange = global.exchange;

const fn = {

    getChangePercent(buyPrice, sellPrice) {
        return (sellPrice - buyPrice) / buyPrice * 100;
        // let gain = (sellPrice - buyPrice) / buyPrice * 100;
        // return +(gain.toFixed(2));
    },
    updatePrice({ price, percent }) {
        return price * (1 + percent / 100)
    },
    isTradable({ baseCur, pair }) {
        //baseCur is not QUOTE_CUR and not FEE_CUR
        let no_trade_reg = NO_TRADE_CUR.length ? '|' + NO_TRADE_CUR.join('|') : '';
        return baseCur ? !new RegExp(QUOTE_CUR + no_trade_reg, 'i').test(baseCur)
            : pair ? (() => {
                        let market = fn.getMarket({ pair: pair });
                        if (market) {
                            return !_.includes(NO_TRADE_CUR, market.baseId);
                        }
                    }
                )()
                : null
    },
    getTradablePairs(pairs) {
        return pairs.filter(pair => fn.isTradable({ pair }))
    },

    getPair({ symbol, baseCur }) {
        return symbol ? (() => {
                let market = fn.getMarket({ symbol })
                return market && market.id;
            })()
            : baseCur ? (() => {
                    let markets = fn.getQuoteMarkets();
                    let market = _.find(markets, { baseId: baseCur });
                    if (market) {
                        return market.id;
                    }
                })()
                : null
    }
    ,
    getSymbol({ pair }) {
        let market = fn.getMarket({ pair });
        return market && market.symbol
    },
    getQuotePairs() {
        return _.keys(exchange.marketsById)
            .filter(id => (new RegExp(QUOTE_CUR, 'i')).test(id))
    },
    getQuoteMarkets() {
        return _.values(exchange.marketsById)
            .filter(m => (new RegExp(QUOTE_CUR, 'i')).test(m.quoteId))
    },

    getMarket({ baseCur, symbol, pair }) {
        return baseCur ? exchange.marketsById[fn.getPair({ baseCur })]
            : symbol ? exchange.market(symbol)
                : pair ? exchange.marketsById[pair.toUpperCase()]
                    : null;
    },

    getBaseCur({ symbol }) {
        let market = exchange.market(symbol);
        return market.baseId;
    },

    async getTotalBaseCurBalance({ symbol }) {
        return fn.getBalance({ cur: fn.getBaseCur({ symbol }), part: 'total' });
    },

    async getFreeBalance({ cur }) {
        return fn.getBalance({ cur, part: 'free' });
    },
    async getUsedBalance({ cur }) {
        return fn.getBalance({ cur, part: 'used' });
    },

    async getBalance({ cur, part }) {
        return (await fn.getBalances()) [cur.toUpperCase()][part];
    },

    async getTicker({ symbol }) {
        return new Promise((resolve) => {
            appEmitter.once('exchange:ticker:' + symbol, ({ ticker }) => {
                resolve(ticker);
            });
        });
    },
    async getBalances() {
        return new Promise((resolve) => {
            appEmitter.once('exchange:balances', ({ balances }) => {
                resolve(balances);
            });
            appEmitter.emit('app:get_balances');
        });
    },
    async getAllPrices() {
        return new Promise((resolve, reject) => {
            appEmitter.once('exchange:prices', ({ prices, error }) => {
                prices && resolve(prices);
                error && reject(error);
            });
            appEmitter.emit('app:get_prices');
        });
    },

    async isCurrentlyTrading({ symbol }) {
        let trades = fn.getTrades();
        return trades[symbol];
    },
    async getTrades() {
        return new Promise((resolve, reject) => {
            appEmitter.once('trade:symbols', ({ symbols }) => {
                resolve(symbols);
            });
            appEmitter.emit('app:get_currently_tradings_symbols')
        })
    },
    async getTradeRatio({ symbol }) {
        return await Model.TradeRatio.load({ symbol });
    },
    async getQuoteTradableQuantity() {
        return (await Model.Settings.load())['QUOTE_CUR_QTY'];
    },
    async getTradeAmount({ symbol, price }) {
        let quoteTradableQuantity = await fn.getQuoteTradableQuantity();
        let quoteTradeBalance = quoteTradableQuantity * await fn.getTradeRatio({ symbol });
        let quoteAvailableBalance = await fn.getFreeBalance({ cur: QUOTE_CUR });
        if (quoteAvailableBalance >= quoteTradeBalance) {
            let remainingQuoteBalance = (quoteAvailableBalance - quoteTradeBalance);
            if (remainingQuoteBalance < quoteTradeBalance) {
                quoteTradeBalance += remainingQuoteBalance;
            }
            return quoteTradeBalance / price;
        }
        return 0;
    },

    async getTrailingChangePercent() {
        return (await Model.Settings.load())['TRAILING_CHANGE_PERCENT'];
    },
    async getStopLossPercent() {
        return (await Model.Settings.load())['STOP_LOSS_PERCENT'];
    },
    fetchTicker({ symbol }) {
        appEmitter.emit('app:fetch_ticker', { symbol });
    },
    noFetchTicker({ symbol }) {
        appEmitter.emit('app:no_fetch_ticker', { symbol });
    },
    fetchDepth({ symbol }) {
        appEmitter.emit('app:fetch_depth', { symbol });
    },
    fetchLongTrend() {
        appEmitter.emit('app:fetch_long_trend');
    },
    fetch24HTrend() {
        appEmitter.emit('app:fetch_24h_trend');
    },
    getLastBuyOrder(orders) {
        return _(orders)
            .filter(o => /BUY/i.test(o.side))
            .filter(o => /CLOSED/i.test(o.status))
            .filter(fn.isM24BotOrder)
            .sortBy([o => new Date(o.datetime)])
            .last()
    },

    getLastStopLossOrder(orders) {
        return _(orders)
            .filter(({ side, status, type }) => /SELL/i.test(side) && /OPEN/i.test(status) && /STOP_LOSS_LIMIT/i.test(type))
            .filter(fn.isM24BotOrder)
            .sortBy([o => new Date(o.datetime)])
            .last()
        //  .value()
    },
    getClientOrderId({ symbol }) {
        return `${symbol}_m24_t${TIMEFRAME}`
    },
    isM24BotOrder(order) {
        if (fn.isBinance() && order.info) {
            let clientOrderId = fn.getClientOrderId(order.info);
            let { info } = order;
            return info.clientOrderId === clientOrderId || info.originalClientOrderId === clientOrderId || info.newClientOrderId === clientOrderId
        }
    },
    isBinance() {
        return EXCHANGE.toLowerCase() === 'binance'
    }

};

module.exports = function (exchange2) {
    exchange = exchange2 || global.exchange || exchange;
    return fn;
};
Object.assign(module.exports, fn);