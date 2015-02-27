"use strict";


module.exports = {};

var exp = module.exports;

exp.init = function(passport, router, config) {
    var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

    passport.use(new GoogleStrategy({
            clientID: config.clientID,
            clientSecret: config.clientSecret,
            callbackURL: config.proxy + "/auth/google/oauth2callback"
        },
        function(accessToken, refreshToken, profile, done) {
            done(null, profile);
        }
    ));

    router.get('/auth/google', passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/userinfo.email'] }));

    router.get('/auth/google/oauth2callback',
        passport.authenticate('google', {
            successRedirect: '/account',
            failureRedirect: '/login'
        }));
};