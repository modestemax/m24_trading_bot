const _ = require('lodash');
const curl = require('curl');
var path = require('path');

const Server = require('simple-websocket/server')
const server = new Server({ port: 12345 }) // see `ws` docs for other options

const express = require('express');
const app = express();


const { getTrades } = require('./utils')();


appEmitter.on('trade:started', trade => {
    socketSend(JSON.stringify({ type: 'trade_start', trade, }))
});

appEmitter.on('trade:updated', trade => {
    socketSend(JSON.stringify({ type: 'trade_update', trade, }))
});

appEmitter.on('trade:ended', trade => {
    socketSend(JSON.stringify({ type: 'trade_end', trade, }))
});

appEmitter.on('trade:changed', trade => {
    socketSend(JSON.stringify({ type: 'trade_change', trade, }))
});


appEmitter.on('trade:new_trade', pushTrades.bind('start'));
appEmitter.on('trade:do_trade', pushTrades);
// appEmitter.on('analyse:try_trade', pushTrades);
appEmitter.on('trade:end_trade', pushTrades.bind('end'));
appEmitter.on('analyse:tracking', pushTracking);
appEmitter.on('app:error', pushError);
appEmitter.on('test:trade', (start, end) => {
    socketSend(JSON.stringify({
        type: 'trades',
        trades: {
            "ETH/BTC": {
                symbol: "ETH/BTC",
                price: 125,
                maxGain: 1,
                minGain: 1,
                gainOrLoss: 1,
                tradeDuration: '1H'
            }
        },
        start: this === 'start',
        end: this === 'end'
    }))
});

async function pushTrades() {
    let trades = await getTrades();
    trades = _.filter(trades, t => t && t.symbol);
    socketSend(JSON.stringify({ type: 'trades', trades, start: this === 'start', end: this === 'end' }))
}

async function pushTracking({ symbol, signalResult }) {
    socketSend(JSON.stringify({ type: 'tracking', trades: { symbol, signalResult } }))
}

function pushError(error) {
    socketSend(JSON.stringify({ type: 'error', error: error && error.toString() }))
}

let sockets = [];

function socketSend(data) {
    sockets = _.compact(sockets).filter(socket => {
        if ((socket.connected)) {
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


app.use('/static', express.static(__dirname + "/../admin/dist/static"));
// app.get('/', async (req, res) => {
//     let host = await curl.get('http://169.254.169.254/latest/meta-data/public-ipv4')
//     res.redirect('/bot?host=' + host||'')
// })
app.get('/', async (req, res) => {
    res.sendFile(path.resolve(__dirname + "/../admin/dist/index.html"))
})
// server.close() return
app.listen(12346);