import Events from 'events';
import Socket from 'simple-websocket';

const appEmitter = new Events();

const socket = new Socket('ws://localhost:12345');
socket.on('connect', () => {
  // socket is connected!
  socket.send('sup!');
});

socket.on('data', (data) => {
  console.log(`got message: ${data}`);
  const clientData = JSON.parse(`${data}`);
  if (clientData.type === 'trades') {
    appEmitter.emit('trades', clientData.trades);
  }
});
socket.on('disconnect', () => {
  // socket is connected!
  debugger;
});
// setInterval(() => {
//   appEmitter.emit('trades', [{ symbol: 'eth/btc' }, { symbol: 'pac/btc' }]);
// }, 1e3);

export default appEmitter;
