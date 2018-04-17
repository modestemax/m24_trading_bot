import Events from 'events';
import Socket from 'simple-websocket';
import moment from 'moment';

const appEmitter = new Events();
let startTime;

setInterval(() => appEmitter.emit('time', { start: startTime.format('HH:mm'), duration: startTime.fromNow(true) }),
  60e3);

export default appEmitter;

(function connect() {
  // debugger;
  const host = window.location.hostname;
  const socket = new Socket(`ws://${host}:12345`);

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
      trade.time = moment(new Date(trade.time)).format('HH:mm');
    }

    switch (clientData.type) {
      case 'trades':
        // debugger;
        appEmitter.emit('trades', clientData);
        break;
      case 'time':
        startTime = moment(new Date(clientData.time));
        appEmitter.emit('time', { start: startTime.format('HH:mm'), duration: startTime.fromNow(true) });
        break;
      case 'error':
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
