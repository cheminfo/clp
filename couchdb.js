'use strict';
var auth;

var exp  = module.exports = {};
exp.init = function*(config) {
    var nano = require('nano')(config.couchUrl),
        co   = require('co'),
        coNano = require('co-nano')(nano),
        couchdb = coNano.use(config.couchDatabase),
        sleep = require('co-sleep');

    exp.db = couchdb;
    co(function*() {
        while(true) {
            yield sleep(1000*60*9); // 9 minutes
            yield doAuth();
        }
    });

    yield doAuth();

    function *doAuth(){
        var res = yield coNano.auth(config.couchUsername, config.couchPassword);
        if(res[0] instanceof Error) {
            throw res[0];
        }
        var headers = res[1];

        if (headers && headers['set-cookie']) {
            auth = headers['set-cookie'];
            var nano = require('nano')({url: config.couchUrl, cookie: auth[0]});
            console.log('cookie', auth[0]);
            coNano = require('co-nano')(nano);
            exp.db = couchdb = coNano.use(config.couchDatabase);
            exp.authCookie = auth[0];
        }
    }
};