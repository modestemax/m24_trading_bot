// const pmx = require('pmx');
const _ = require('lodash');
const { trend } = require('./analyse');
let pumpMin = 0;

const pmx = require('pmx').init({
    http: true, // HTTP routes logging (default: true)
    ignore_routes: [/socket\.io/, /notFound/], // Ignore http routes with this pattern (Default: [])
    errors: true, // Exceptions logging (default: true)
    custom_probes: true, // Auto expose JS Loop Latency and HTTP req/s as custom metrics
    network: true, // Network monitoring at the application level
    ports: true  // Shows which ports your app is listening on (default: false)
});


pmx.action('change pump min', function (min, reply) {
    pumpMin = +min;
    reply(result());
});
//
// setInterval(() => {
//       (result())
// }, 10e3)

pmx.scopedAction('long pump', function (data, res) {
    res.send(result())
    setInterval(() => {
        res.send(result())
    }, 10e3)
});

function result(min = pumpMin) {
    return _.orderBy(_.map(trend), 'change', 'desc').filter(t => t.change > min).slice(0, 2).reduce((resp, t) => {
        return resp + `${t.symbol} ${t.change.toFixed(2)}%\n`
    }, `${new Date().toString()}\n`)
}