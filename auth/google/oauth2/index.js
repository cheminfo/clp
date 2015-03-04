"use strict";


module.exports = {};

var exp = module.exports;

exp.init = function(passport, router, config) {
    var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

    passport.use(new GoogleStrategy({
            clientID: config.clientID,
            clientSecret: config.clientSecret,
            callbackURL: config.proxy + config.callbackURL
        },
        function(accessToken, refreshToken, profile, done) {
            done(null, profile);
        }
    ));

    router.get(config.loginURL, passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/userinfo.email'] }));

    router.get(config.callbackURL,
        passport.authenticate('google', {
            successRedirect: config.successRedirect,
            failureRedirect: config.failureRedirect
        }));
};