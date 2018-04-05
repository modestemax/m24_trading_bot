import Events from 'events';

const appEmitter = new Events();

setInterval(() => {
  appEmitter.emit('trades', [{ symbol: 'eth/btc' }, { symbol: 'pac/btc' }]);
}, 1e3);

export default appEmitter;
