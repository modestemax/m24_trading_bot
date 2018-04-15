Promise.prototype.finally = function (cb) {
    const res = () => this
    const fin = (safe) => () => Promise.resolve(cb(safe)).then(res);
    return this.then(fin(true), fin(false));
};