const debug = require('debug')('signals');
const redisLib = require('redis');
const _ = require('lodash');
const Promise = require('bluebird');


module.exports = function ({ env, appEmitter }) {
    let { emitException } = appEmitter;
    let { REDIS_PORT, REDIS_HOST, EXCHANGE } = env;
    const redisClient = redisLib.createClient(REDIS_PORT, REDIS_HOST);
    const redis = Promise.promisifyAll(redisClient);

    appEmitter.on('analyse:newData', async (data) => {
        const { symbolId, timeframe } = data;
        const strData = JSON.stringify(data);
        const key = `${EXCHANGE}:${symbolId}:${timeframe}`;
        await redis.set(key, strData);
        await redis.publish('newData', strData);
    })
};

