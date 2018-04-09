import Events from 'events';
import Socket from 'simple-websocket';

const appEmitter = new Events();

export default appEmitter;

(function connect() {
  // debugger;
  const host = window.location.search.split('=')[1] || 'localhost';
  const socket = new Socket(`ws://${host}:12345`);
  socket.on('connect', () => {
    // socket is connected!
    // socket.send('sup!');
    appEmitter.emit('online');
  });

  socket.on('data', (data) => {
    // console.log(`got message: ${data}`);
    const clientData = JSON.parse(`${data}`);
    switch (clientData.type) {
      case 'trades':
        // debugger;
        appEmitter.emit('trades', clientData.trades);
        break;
      case 'error':
        appEmitter.emit('error', clientData.error);
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
