'use strict';

module.exports = function (err) {
    if (err && err.stack) {
        console.error(err.stack);
    }
    else {
        console.error(err);
    }
};
