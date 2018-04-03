const redisPubSub = require('redis-pubsub-emitter');

// The factory method takes the same parameters as redis.createClient()
const redisPubSubClient = redisPubSub.createClient(6379, 'localhost');


const {getTrades} = require('./utils');


appEmitter.on('trade:new_trade', pushTrades);
appEmitter.on('trade:end_trade', pushTrades);
appEmitter.on('app:error', pushError);
redisPubSubClient.on('m24:get:settings', pushSettings);

async function pushTrades() {
    redisPubSubClient.publish('m24:trades', await getTrades())
}

function pushError(error) {
    redisPubSubClient.publish('m24:error', error)
}

function pushSettings() {
    redisPubSubClient.publish('m24:settings', env)
}

// appEmitter.on('exchange:ticker', async function () {
//     appPubSub.emit('m24:trades', await getTrades());
// });

//test


redisPubSubClient.on('m24:trades',(data)=>{
debugger
})

appEmitter.emit('trade:new_trade');
// appEmitter.on('trade:end_trade', pushTrades);
// appEmitter.on('app:error', pushError);
// appPubSub.on('m24:get:settings', pushSettings);