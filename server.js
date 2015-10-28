'use strict';
global.Promise = require('bluebird');
var path       = require('path'),
    config     = require('./config')('./config.json'),
    couchdb    = require('./couchdb'),
    proxy      = require('./proxy'),
    auth       = require('./auth'),
    app        = require('koa')(),
    router     = require('koa-router')(),
    passport   = require('koa-passport'),
    co         = require('co'),
    bodyParser = require('koa-bodyparser'),
    session    = require('koa-session'),
    render     = require('koa-ejs'),
    cors       = require('kcors');

render(app, {
    root: path.join(__dirname, 'views'),
    layout: 'template',
    viewExt: 'ejs',
    cache: false,
    debug: true
});

var ONE_YEAR = 365 * 24 * 60 * 60 * 1000;
app.use(bodyParser({
    jsonLimit: '100mb'
}));
app.keys = ['some secret'];
app.use(session({
    maxAge: 100 * ONE_YEAR
}, app));
app.use(passport.initialize());
app.use(passport.session());
app.use(cors());


co(function*() {
    yield couchdb.init(config);
    proxy.init(router, config);
    auth.init(passport, router, config);
    app.listen(config.port || 3000);
    app.on('error', function(err){
        console.error('server error', err);
    });
}).catch(handleError);

function handleError(err) {
    console.log('Error', err.stack);
}

// Unhandled errors
app.use(function *(next) {
    try {
        yield next;
    } catch (err) {
        this.status = err.status || 500;
        this.body = err.message;
        console.error('Unexpected error', err, err.stack);
    }
});

app.use(router.routes());
