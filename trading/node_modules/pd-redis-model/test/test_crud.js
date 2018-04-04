'use strict';
var q = require('q');
var announcer = require('pd-api-announcer');
var anno = require('pd-api-test-anno')();
var eReport = require('pd-test-report-error');
var expect = require('chai').expect;

var modelMaker = require('../');
var Merchants = modelMaker('merchant');
var Owners = modelMaker('owner');
var Patrons = modelMaker('patron');

Merchants.setUniqueDef('name', ['name']);
Owners.setUniqueDef('reg-name', ['reg-name']);
Patrons.setUniqueDef('pno', ['pno']);

Patrons.needInputOf('nick');
Patrons.eachInputOf('nick').mustMatch(/^\w{6}$/);

Owners.mother(Merchants);
Patrons.mother(Merchants);

describe('Redis-model', function () {
    var ownersToDelete = [];
    var mercsToDelete = [];
    var patsToDelete = [];

    it('should allow creating records', function (done) {
        anno.tcase(function () {
            return Owners.create({
                name: 'johndoe',
                'reg-name': 'johndoe'
            }, function (multis) {
                console.log(multis);
                return multis;
            }).then(function (sid) {
                ownersToDelete.push(sid);
                console.log('created owner with sid:' + sid);
                return Owners.merchantOwner(sid).bear({
                    name: 'Small-Cafe'
                });
            }).then(function (sid) {
                mercsToDelete.push(sid);
                console.log('created merchant with sid:' + sid);
                return Patrons.create({
                    pno: 'sc-1234',
                    nick: ''
                });
            }).then(function () {
                eReport('missed empty nick!');
            }).fail(function (err) {
                announcer.assertReqErrorFor(err, 'nick', 'empty');
                console.log('Caught empty nick..');
                return Patrons.create({
                    pno: 'sc-1234',
                    nick: '&&&AA'
                });
            }).then(function () {
                eReport('missed wrongly formatted nick');
            }).fail(function (err) {
                announcer.assertReqErrorFor(err, 'nick', 'format');
                console.log('Caught wrongly formatted nick..');
                return Patrons.create({
                    name: 'janedoe',
                    pno: 'sc-1234',
                    nick: 'Bubbly'
                });
            }).then(function (sid) {
                patsToDelete.push(sid);
                console.log('created patron with sid:' + sid);
                return Patrons.merchantOwner(sid).adopt(mercsToDelete[0]);
            }).fail(function (err) {
                eReport(err);
            });
        }, done, 'creating');
    });

    it('should not allow creating record with invalid constraints', function (done) {
        anno.tcase(function () {
            return Owners.amount().then(function (amount) {
                expect(amount).to.equal(1);
                return Owners.create({
                    name: 'charlie',
                    'reg-name': 'johndoe'
                }, function (multi) {
                    console.log(multi);
                    return multi;
                });
            }).then(function () {
                eReport('missed duplicate reg-name!');
            }).fail(function (err) {
                announcer.assertReqErrorFor(err, 'reg-name', 'taken');
                console.log('caught uniqueness conflict');
                return Owners.amount();
            }).then(function (amount) {
                expect(amount).to.equal(1);
                console.log('Owner did not increase by mistake..');
            }).fail(function (err) {
                eReport(err);
            });
        }, done, 'invalid-constraints');
    });

    it('should list records with right relationship', function (done) {
        anno.tcase(function () {
            var MomOwner = Owners.merchantOwner(ownersToDelete[0]);
            var MomPatron = Patrons.merchantOwner(patsToDelete[0]);
            var showPromises = [];
            [MomOwner, MomPatron].forEach(function (mom) {
                showPromises.push(
                    mom.hasKid(mercsToDelete[0]).then(function () {
                        return mom.findKids({
                            latest: (new Date()).getTime(),
                            earliest: 0
                        });
                    }).then(function (kids) {
                        expect(kids.length).to.equal(mercsToDelete.length);
                        console.log(kids);

                    })
                );
            });
            return q.allSettled(showPromises);
        }, done, 'show-relationship');
    });

    after(function (done) {
        anno.fin(function () {
            var kidPromises = [];
            mercsToDelete.forEach(function (sid) {
                kidPromises.push(
                    Merchants.remove(sid).fail(function (err) {
                        eReport(err);
                    })
                );
            });
            return q.allSettled(kidPromises).then(function () {
                var momPromises = [];
                [
                    [Owners, ownersToDelete],
                    [Patrons, patsToDelete]
                ].forEach(function (item) {
                        item[1].forEach(function (sid) {
                            momPromises.push(
                                item[0].remove(sid).fail(function (err) {
                                    eReport(err);
                                })
                            );
                        });
                    });
                return q.allSettled(momPromises);
            }).then(function () {
                var clearPromises = [];
                [Merchants, Owners, Patrons].forEach(function (model) {
                    clearPromises.push(model.clearSidCounter().fail(function (err) {
                        eReport(err);
                    }));
                });
                return q.allSettled(clearPromises);
            });
        }, done, 'Redis-model');
    });
});
