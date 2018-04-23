import Events from 'events';
import Socket from 'simple-websocket';
import moment from 'moment';
// import _ from 'lodash';

const appEmitter = new Events();
let startTime;

setInterval(() => startTime && appEmitter.emit('time', {
  start: startTime.format('HH:mm'),
  duration: startTime.fromNow(true),
}), 60e3);
export const formatTime = (time, format = 'HH:mm') => moment(new Date(time)).format(format);
export const fixed8 = value => (+value).toFixed(8);
export const fixed2 = value => (+value).toFixed(2);

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
    // const trade = clientData.trade;
    // if (trade) {
    //   clientData.trades = [trade];
    // }


    switch (clientData.type) {
      case 'trades':
        appEmitter.emit('trades', { trades: clientData.trades });

        break;
      case 'time':
        startTime = moment(new Date(clientData.time));
        appEmitter.emit('time', {
          start: formatTime(clientData.time, 'HH:mm  DD MMM'),
          duration: startTime.fromNow(true),
          details: clientData.details,
        });
        break;
      case 'error':
        clientData.error.time = formatTime(clientData.error.time);
        appEmitter.emit('srv_error', clientData.error);
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
