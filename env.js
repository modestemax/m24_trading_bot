const apijson = process.env.HOME + '/.api.json';
const api = require(apijson);

const env = process.env;

global.env = module.exports = {
    EXCHANGE: env.EXCHANGE || 'binance',
    AMOUNT_TO_TRADE: env.AMOUNT_TO_TRADE || 0,
    TIMEFRAME: env.TIMEFRAME || 15,
    APIKEY: api.api_key,
    SECRET: api.secret
}
