const _ = require('lodash');
const curl = require('curl');
var path = require('path');
const moment = require('moment');
const Server = require('simple-websocket/server')
const formatError = require('format-error').format;

const PORT = process.env.PORT || 9090;
const SOCKET_PORT = process.env.PORT ? PORT * 2 : 8080 * 2;


const server = new Server({ port: SOCKET_PORT }) // see `ws` docs for other options

const express = require('express');
const app = express();

const serverStartTime = Date.now();

const { getTrades } = require('./utils')();


appEmitter.on('trade:started', trade => {
    socketSend(JSON.stringify({ type: 'trade_start', trade: formatTrade(trade) }))
});

appEmitter.on('trade:updated', trade => {
    socketSend(JSON.stringify({ type: 'trade_update', trade: formatTrade(trade), }))
});

appEmitter.on('trade:ended', trade => {
    trade._end_ = true;
    socketSend(JSON.stringify({ type: 'trade_end', trade: formatTrade(trade), }))
});

appEmitter.on('trade:changed', trade => {
    // !(trade._end_ || (trade._moon_ && trade._moon_ === 'danger')) && socketSend(JSON.stringify({
    //     type: 'trade_change',
    //     trade: formatTrade(trade),
    // }))
    socketSend(JSON.stringify({ type: 'trade_change', trade: formatTrade(trade), }))
});


appEmitter.on('trade:new_trade', pushTrades.bind('start'));
appEmitter.on('trade:do_trade', pushTrades);
// appEmitter.on('analyse:try_trade', pushTrades);
appEmitter.on('trade:end_trade', pushTrades.bind('end'));
// appEmitter.on('analyse:tracking', pushTracking);
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
    trades = _.map(trades, formatTrade);
    socketSend(JSON.stringify({ type: 'trades', trades, start: this === 'start', end: this === 'end' }))
}

async function pushTracking({ symbol, signalResult }) {
    socketSend(JSON.stringify({ type: 'tracking', trades: { symbol, signalResult } }))
}

function pushError(error) {

    socketSend(JSON.stringify({ type: 'error', error: { time: Date.now(), error: formatError(error) } }))

}

let sockets = [];

function socketSend(data) {
    sockets = _.compact(sockets).filter(socket => {
        if ((socket.connected)) {
            socket.send(data);
            return true
        }
    });
}

function sendStartTime() {
    let time = JSON.stringify({ type: 'time', time: serverStartTime });
    socketSend(time);
}

function formatTrade(trade) {
    return _.extend({}, trade, {
        timestamp: trade.time,
        update: trade.update ? '+' + trade.update : '',
        // time: moment(new Date(trade.time)).format('HH:mm'),
        sellPrice: (+trade.sellPrice).toFixed(8),
        lastPrice: (+trade.lastPrice).toFixed(8),
        buyPrice: (+trade.buyPrice).toFixed(8),
        minGain: (+trade.minGain).toFixed(2) + '%',
        gainOrLoss: (+trade.gainOrLoss).toFixed(2) + '%',
        maxGain: (+trade.maxGain).toFixed(2) + '%',
        target: (+trade.target).toFixed(2) + '%',
        tradeDuration: moment.duration(Date.now() - trade.time).humanize(),
        // _rowVariant: trade.maxGain >= env.SELL_LIMIT_PERCENT ? 'success' : (trade.minGain <= env.STOP_LOSS_PERCENT ? 'danger' : '')
        _rowVariant: (() => {
            if (!trade._moon_ || trade._moon_ === 'danger') {
                let moon;
                if (trade.maxGain >= trade.target) moon = 'info';
                else if (trade.maxGain >= env.SELL_LIMIT_PERCENT) moon = 'success';
                else if (trade.minGain <= env.STOP_LOSS_PERCENT) moon = 'danger';
                if (moon !== 'danger' && trade._moon_ === 'danger') {
                    trade._moon_ = 'warning';
                    trade.effectiveDuration = trade.tradeDuration;
                } else
                    trade._moon_ = moon;
            }
            trade._moon_ && (trade.effectiveDuration = trade.effectiveDuration || trade.tradeDuration);
            trade._moon_ && appEmitter.emit('exchange:sell_ok:' + trade.symbol, ({ trade: { price: trade.sellPrice } }));
            return trade._moon_;
        })()
    });
}

server.on('connection', function (socket) {
    sockets.push(socket);
    pushTrades();
    sendStartTime();
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
app.listen(PORT);