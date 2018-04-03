'use strict';
var q = require('q');
var announcer = require('pd-api-announcer');
var methodNomen = require('./nomenclt');
var nm = require('./parenthood-nomenclt');
module.exports = function (Parent, Child) {
    var hasChildName = methodNomen.ifOwns(Child);
    Parent[hasChildName] = function (parentSid, childSid) {
        return q.Promise(function (resolve, reject) {
            var cId = childSid + '';
            var redisKey = nm.childOf(Child.modelName(), Parent.modelName(), parentSid);
            Child.redis.zsetExists(redisKey, cId).then(function (reply) {
                resolve(reply);
            }).fail(function (err) {
                if (announcer.error(err).isSysFor('zsetItem', 'gone')) {
                    throw announcer.error.sys(Child.modelName(), 'gone');
                }
            }).fail(function (err) {
                reject(err);
            });
        });
    };
};
