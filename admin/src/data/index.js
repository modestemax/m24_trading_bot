import Events from 'events';
import Socket from 'simple-websocket';

const appEmitter = new Events();

export default appEmitter;

(function connect() {
  const socket = new Socket('ws://localhost:12345');
  socket.on('connect', () => {
    // socket is connected!
    // socket.send('sup!');
  });

  socket.on('data', (data) => {
    // console.log(`got message: ${data}`);
    const clientData = JSON.parse(`${data}`);
    switch (clientData.type) {
      case 'trades':
        debugger;
        appEmitter.emit('trades', clientData.trades);
        break;
      case 'error':
        appEmitter.emit('error', clientData.error);
        break;
      default:

    }
  });
  socket.on('close', () => {
    setTimeout(connect, 0);
  });
  socket.on('error', (err) => {
    socket.destroy(err);
  });

// setInterval(() => {
//   appEmitter.emit('trades', [{ symbol: 'eth/btc' }, { symbol: 'pac/btc' }]);
// }, 1e3);
}());
