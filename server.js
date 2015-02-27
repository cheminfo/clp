'use strict';

var url        = require('url'),
    path       = require('path'),
    config     = processConfig(require('./config.json')),
    couchdb    = require('./couchdb'),
    proxy      = require('./proxy'),
    auth       = require('./auth'),
    app        = require('koa')(),
    router     = require('koa-router')(),
    passport    = require('koa-passport'),
    co         = require('co'),
    bodyParser = require('koa-bodyparser'),
    session    = require('koa-session'),
    render     = require('koa-ejs');

render(app, {
    root: path.join(__dirname, 'views'),
    layout: 'template',
    viewExt: 'ejs',
    cache: false,
    debug: true
});


app.use(bodyParser());
app.keys = ['some secret'];
app.use(session(app));
app.use(passport.initialize());
app.use(passport.session());

co(function*() {
    yield couchdb.init(config);
    proxy.init(router, config);
    auth.init(passport, router, config);
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
    config.proxy = config.proxy.replace(/\/$/, '');
    return config;
}

app.use(router.routes())
    .use(router.allowedMethods());
