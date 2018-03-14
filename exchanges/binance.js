async function createOrder({side, type = 'MARKET', symbol, totalAmount, ratio = 100, callback = _.noop, retry = 5}) {
    try {
        if (symbol) {
            let loadExchangeInfo = infoLoader();
            let quantity;
            const [base, quote] = symbol.split('/');
            const tradingPair = base + quote;
            let minimun = (await loadExchangeInfo())[tradingPair];
            let price = await getPrice({symbol});

            if (side === 'BUY') {
                let amount = totalAmount * ratio / 100;
                quantity = amount / price;
            } else {
                quantity = await balance(base);
            }

            quantity = +(quantity - quantity % minimun.stepSize).toFixed(8)
            if (quantity) {
                let newOrder = 'newOrder';
                if (process.env.NODE_ENV !== 'production' || true) {
                    newOrder = 'testOrder';
                    //  totalAmount = 10;
                }
                let order = await binanceReady(() => binanceRest[newOrder]({
                    symbol: tradingPair,
                    side, type, quantity
                }), {priority: 1});

                order = await addHelperInOrder({order, symbol: tradingPair, price, quantity});
                setImmediate(() => callback(null, Object.assign({info: side + ' Order placed ' + symbol}, order)));
            } else {
                callback(`Can't ${side} Undefined Quantity`)
            }
        } else {
            callback(`Can't ${side} undefined symbol`)
        }
    } catch (ex) {
        let err = ex && JSON.stringify(ex.msg)
        console.log(ex, retry && 'Retrying ' + (1 - retry));
        if (/LOT_SIZE/.test(ex.msg)) {
            return setImmediate(() => callback(err));
        }
        if (retry)
            setTimeout(() => createOrder({side, type, totalAmount, ratio, symbol, callback, retry: --retry}), 500);
        else
            setImmediate(() => callback(err));
    } finally {
        binanceBusy = false;
    }
}
