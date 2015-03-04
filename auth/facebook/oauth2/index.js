'use strict';

var FacebookStrategy = require('passport-facebook');
module.exports = {};

module.exports.init = function(passport, router, config) {
    passport.use(new FacebookStrategy({
            clientID: config.appId,
            clientSecret: config.appSecret,
            callbackURL: config.proxy + config.callbackURL,
            enableProof: false
        },
        function(accessToken, refreshToken, profile, done) {
            console.log(profile);
            done(null, profile);
        }
    ));

    router.get(config.loginURL,
        passport.authenticate('facebook', {scope: ['public_profile', 'email']}));

    router.get(config.callbackURL,
        passport.authenticate('facebook', { failureRedirect: config.failureRedirect }),
        function*() {
            // Successful authentication, redirect home.
            this.response.redirect(config.successRedirect);
        });
};

