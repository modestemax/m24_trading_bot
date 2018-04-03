var redisPubSub = require('redis-pubsub-emitter');

// The factory method takes the same parameters as redis.createClient()
// var redisPubSubClient = redisPubSub.createClient(6379, 'localhost');
var redisPubSubClient = redisPubSub.createClient();

// Both on() and once() support *-wildcards, therefore the actual topic
// is always passed through
function handleNews(payload, topic) {
    console.log('News on channel %s: %s', topic, payload);
};
redisPubSubClient.on('news.uk.*', handleNews);

// removeListener() will also remove the subscription from redis if
// no other handler is attached
//redisPubSubClient.removeListener('news.uk.*', handleNews);

// Publish send a message to redis. This will also call all event
// listeners that are attached to that topic
redisPubSubClient.publish('news.uk.politics', 'message');

// Emit will ONLY emit to local event listeners, no redis message
// will be send
//redisPubSubClient.emit('news.uk.*', 'fake news', 'news.uk.fake');

redisPubSubClient.on('m24:trades', (data) => {
    debugger
})
