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
    socketSend(JSON.stringify({ type: 'trades', trades }))
}

async function pushTracking({ symbol, signalResult }) {
    socketSend(JSON.stringify({ type: 'tracking', trades: { symbol, signalResult } }))
}

function pushError(error) {
    socketSend(JSON.stringify({ type: 'error', error }))
}

let sockets = [];

function socketSend(data) {
    sockets = _.compact(sockets).filter(socket => {
        if ((socket.connected){
            socket.send(data)
            return true
        }
    })
}

server.on('connection', function (socket) {
    sockets.push(socket);

    //  debugger
    // socket.write('pong')
    socket.on('data', function (data) {
        //   debugger
    })
    socket.on('close', function () {
        sockets.splice(sockets.findIndex(s => s === socket), 1)
    })
    socket.on('error', function (err) {
        // debugger
    })
});

// server.close()