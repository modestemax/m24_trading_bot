function getChangePercent(buyPrice, sellPrice) {
    return (sellPrice - buyPrice) / buyPrice * 100;
    // let gain = (sellPrice - buyPrice) / buyPrice * 100;
    // return +(gain.toFixed(2));
}

function updatePrice({price, percent}) {
    return price * (1 + percent / 100)
}


const hex = require('text-hex');

// Extend the string type to allow converting to hex for quick access.
String.prototype.toHex = function () {
    let color = hex(this);
    return color.substring(1);
};
String.prototype.toUniqHex = function () {
    return this + (new Date().getTime().toString()).toHex();
};


module.exports = {getChangePercent, updatePrice}