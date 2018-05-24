const debug = require('debug')('signals');
const redisLib = require('redis');
const _ = require('lodash');
const Promise = require('bluebird');


module.exports = function ({ env, appEmitter }) {
    let { emitException } = appEmitter;
    let { REDIS_PORT, REDIS_HOST, EXCHANGE, timeframesIntervals } = env;
    const redisClient = redisLib.createClient(REDIS_PORT, REDIS_HOST);
    const redis = Promise.promisifyAll(redisClient);

    appEmitter.on('analyse:newData', async (data) => {
        const { symbolId, timeframe, time, id } = data.candle;

        const prevTime = new Date((id - 1) * timeframesIntervals[timeframe]);
        const [prevKey, key] = [prevTime, time].map(time => {
            const timeKey = `${time.getDate()}/${time.getMonth()+1}:${time.getHours()}h${time.getMinutes()}`;
            return `${EXCHANGE}:${symbolId}:${timeKey}:m${timeframe}`;
        });

        data.__previous__ = prevKey;
        const strData = JSON.stringify(_.omit(data, ['points',]));
        await redis.set(key, strData);
        await redis.publish('newData', strData);
    })
};

