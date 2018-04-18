import Events from 'events';
import Socket from 'simple-websocket';
import moment from 'moment';
import _ from 'lodash';

const appEmitter = new Events();
let startTime;

setInterval(() => appEmitter.emit('time', {
  start: startTime.format('HH:mm'),
  duration: startTime.fromNow(true),
}), 60e3);
export const formatTime = (time, format) => moment(new Date(time)).format(format || 'HH:mm');

export default appEmitter;

(function connect() {
  // debugger;
  const host = window.location.hostname;
  const port = window.location.port;
  const socket = new Socket(`ws://${host}:${port * 2}`);

  socket.on('connect', () => {
    // socket is connected!
    // socket.send('sup!');
    appEmitter.emit('online');
  });

  socket.on('data', (data) => {
    // console.log(`got message: ${data}`);
    const clientData = JSON.parse(`${data}`);
    const trade = clientData.trade;
    if (trade) {
      clientData.trades = [trade];
    }
    _.forEach(clientData.trades, (t) => {
      _.extend(t, { time: formatTime(t.time) });
    });


    switch (clientData.type) {
      case 'trades':
        // debugger;
        appEmitter.emit('trades', clientData);
        break;
      case 'time':
        startTime = moment(new Date(clientData.time));
        appEmitter.emit('time', {
          start: formatTime(clientData.time, 'HH:mm  DD MMM'),
          duration: startTime.fromNow(true),
        });
        break;
      case 'error':
        clientData.error.time = formatTime(clientData.error.time);
        appEmitter.emit('error', clientData.error);
        break;
      case 'trade_start':
        appEmitter.emit('trade_start', clientData.trade);
        break;
      case 'trade_update':
        appEmitter.emit('trade_update', clientData.trade);
        break;
      case 'trade_end':
        appEmitter.emit('trade_end', clientData.trade);
        break;
      case 'trade_change':
        appEmitter.emit('trade_change', clientData.trade);
        break;
      default:

    }
  });
  socket.on('close', () => {
    appEmitter.emit('offline');
    setTimeout(connect, 0);
  });
  socket.on('error', (err) => {
    socket.destroy(err);
  });

// setInterval(() => {
//   appEmitter.emit('trades', [{ symbol: 'eth/btc' }, { symbol: 'pac/btc' }]);
// }, 1e3);
}());
