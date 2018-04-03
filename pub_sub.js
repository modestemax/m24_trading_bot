const redisPubSub = require('redis-pubsub-emitter');

// The factory method takes the same parameters as redis.createClient()
const redisPubSubClient = redisPubSub.createClient(6379, 'localhost');


const {getTrades} = require('./utils')();


appEmitter.on('trade:new_trade', pushTrades);
appEmitter.on('trade:end_trade', pushTrades);
appEmitter.on('app:error', pushError);

redisPubSubClient.on('*m24:get:settings', pushSettings);
redisPubSubClient.on('*m24:set:settings', Model.Settings.updateSettings);
redisPubSubClient.on('*m24:get:ratio', pushRatio);
redisPubSubClient.on('*m24:set:ratio', Model.TradeRatio.updateTradeRatio);

async function pushTrades() {
    redisPubSubClient.publish(appKey + 'm24:trades', await getTrades())
}

function pushError(error) {
    redisPubSubClient.publish(appKey + 'm24:error', error)
}

async function pushSettings() {
    let settings = await Model.Settings.load();
    redisPubSubClient.publish(appKey + 'm24:settings', settings)
}

async function pushRatio() {
    let ratio = await Model.TradeRatio.load();
    redisPubSubClient.publish(appKey + 'm24:ratio', ratio)
}

// appEmitter.on('exchange:ticker', async function () {
//     appPubSub.emit('m24:trades', await getTrades());
// });
