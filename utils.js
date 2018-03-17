function getChangePercent(buyPrice, sellPrice) {
    return (sellPrice - buyPrice) / buyPrice * 100;
    // let gain = (sellPrice - buyPrice) / buyPrice * 100;
    // return +(gain.toFixed(2));
}

function updatePrice({price, percent}) {
    return price * (1 + percent / 100)
}

module.exports = {getChangePercent, updatePrice}