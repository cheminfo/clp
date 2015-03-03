'use strict';

exports = module.exports = {};

var LocalStrategy = require('passport-local').Strategy,
    request       = require('co-request'),
    co            = require('co'),
    error         = require('../../error'),
    auth          = require('../../auth')

exports.init = function(passport, router, config) {
    passport.use(new LocalStrategy({
            usernameField: 'name'
        },
        function (username, password, done) {
            co(function*() {
                console.log(this);
                var res = yield request.post(config.couchUrl + '/' + '_session', {form: {name: username, password: password}});
                console.log(res);
                if(res[0] instanceof Error) {
                    return done(res[0]);
                }
                res = JSON.parse(res.body);

                if(res.error) {
                    return done(null, false, res.reason);
                }
                done(null, {
                    email: res.name,
                    provider: 'local'
                });
            });
            //done(null, false, errMessage);
    }));

    router.post('/_session', passport.authenticate('local', {}), function*() {
        var that = this;
        this.body = JSON.stringify({
            ok: true,
            name: auth.getUserEmail(that)
        })
    });

    //router.post('/_session', function*() {
    //    var res = yield request.post(config.couchUrl + '/' + '_session', {form: {name: this.request.body.name, password: this.request.body.password}});
    //    res = JSON.parse(res.body);
    //    console.log(res);
    //    if(!res.error) {
    //        this.session.passport.user = {
    //            email: res.name,
    //            provider: 'couchdb'
    //        };
    //        console.log(this.session);
    //        this.body = JSON.stringify(res);
    //    }
    //    else {
    //        error.handleError(this, res);
    //    }
    //    console.log(this.request.body);
    //});
};
