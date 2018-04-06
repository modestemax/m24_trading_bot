const _ = require('lodash');
var Server = require('simple-websocket/server')

var server = new Server({ port: 12345 }) // see `ws` docs for other options


const { getTrades } = require('./utils')();


appEmitter.on('trade:new_trade', pushTrades);
appEmitter.on('analyse:try_trade', pushTrades);
appEmitter.on('trade:end_trade', pushTrades);
appEmitter.on('analyse:tracking', pushTracking);
appEmitter.on('app:error', pushError);

async function pushTrades() {
    let trades = await getTrades();
    // trades=_.mapValues(trades,(t,k)=>({symbol:k}));
    socket.send(JSON.stringify({ type: 'trades', trades }))
}

async function pushTracking({ symbol, signalResult }) {
    socket.send(JSON.stringify({ type: 'tracking', trades: { symbol, signalResult } }))
}

function pushError(error) {
    socket.send(JSON.stringify({ type: 'error', error }))
}


server.on('connection', function (socket) {


    //  debugger
    // socket.write('pong')
    socket.on('data', function (data) {
        //   debugger
    })
    socket.on('close', function () {
        debugger
    })
    socket.on('error', function (err) {
        debugger
    })
})

// server.close()