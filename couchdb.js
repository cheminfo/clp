'use strict';
var Promise    = require('bluebird'),
    auth;

var exp = module.exports = {};
exp.init = function(config) {
    var nano       = require('nano')(config.couchUrl),
        couchdb    = nano.use(config.couchDatabase);

    var authenticated =  new Promise(function (resolve, reject) {
        nano.auth(config.couchUsername, config.couchPassword, function (err, body, headers) {
            if (err) {
                return reject(err);
            }

            if (headers && headers['set-cookie']) {
                auth = headers['set-cookie'];
                nano = require('nano')({url: config.couchUrl, cookie: auth[0] });
                couchdb = nano.use(config.couchDatabase);
            }
            return resolve();
        });
    });
    return authenticated;
}

