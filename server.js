'use strict';

var url = require('url'),
    config  = processConfig(require('./config.json')),
    Promise = require('bluebird'),
    app     = require('koa')(),
    router  = require('koa-router')(),
    passport = require('koa-passport'),
    nano    = require('nano')(config.couchUrl),
    couchdb = nano.use(config.couchDatabase),
    co      = require('co'),
    proxy   = require('koa-proxy');

var auth;

var routesNoLog = ['/','/_uuids'];
var routesWithLog = ['/c/_design/flavor/_view/docs'];

co(function*() {
    yield initNano();
    app.listen(3000);


    app.on('error', function(err){
        console.error('server error', err);
    });
}).catch(handleError);

function handleError(err) {
    console.log('Error', err.stack);
}


function processConfig(config) {
    config.couchUrl = config.couchUrl.replace(/\/$/, '');
    var parsedUrl = url.parse(config.couchUrl);
    config.couchHost = parsedUrl.hostname;
    config.couchPath = parsedUrl.path;
    return config;
}

function initNano() {
    return new Promise(function (resolve, reject) {
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
}

for(var i=0; i<routesNoLog.length; i++) {
    router.get(routesNoLog[i], changeHeaderNoLog, proxy({
        url: config.couchUrl + routesNoLog[i]
    }))
}

for(i=0; i<routesWithLog.length; i++) {
    router.get(routesWithLog[i], changeHeader, proxy({
        url: config.couchUrl + routesWithLog[i]
    }))
}

function *changeHeaderNoLog(next) {
    this.headers.host = config.couchHost;
    yield next;
}

function *changeHeader(next) {
    this.headers.host = config.couchHost;
    this.headers.cookie = auth[0];
    yield next;
}

var GoogleStrategy = require('passport-google').Strategy;
passport.use(new GoogleStrategy({
        returnURL: 'http://localhost:' + (process.env.PORT || 3000) + '/auth/google/callback',
        realm: 'http://localhost:' + (process.env.PORT || 3000)
    },
    function(identifier, profile, done) {
        console.log('identifier: ', identifier);
        console.log('profile: ', profile);
        done(null, identifier);
    }
));

// Redirect the user to Google for authentication.  When complete, Google
// will redirect the user back to the application at
//     /auth/google/return
router.get('/auth/google', passport.authenticate('google'));

// Google will redirect the user to this URL after authentication.  Finish
// the process by verifying the assertion.  If valid, the user will be
// logged in.  Otherwise, authentication has failed.
router.get('/auth/google/return',
    passport.authenticate('google', { successRedirect: '/',
        failureRedirect: '/login' }));

router.get('/login', function*() {
     this.body = '<a href="/auth/google" />';
});

app.use(router.routes())
    .use(router.allowedMethods());
