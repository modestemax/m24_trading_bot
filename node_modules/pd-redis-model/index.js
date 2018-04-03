'use strict';

var base = require('pd-redis-base-record');
var setUniques = require('pd-redis-set-uniques');
var parentize = require('pd-redis-parentize');
var inputRequired = require('pd-model-input-required');

module.exports = function (modelName, cli) {
    var core = base(modelName, cli);
    inputRequired(core);
    setUniques(core);
    core.mother = function (Child) {
        parentize(core, Child);
        return core;
    };

    return core;
};
