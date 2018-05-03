const { TRADING_STRATEGY, START_TRADE_BUY_PERCENT } = env;

if (TRADING_STRATEGY === 'TRAILLING_STOP_LOSS') {
  return  require('./trade_trailling_stop_loss')
} else if (TRADING_STRATEGY === 'SELL_LIMIT') {
   return require('./trade_sell_limit')
}