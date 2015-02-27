'use strict';

var url        = require('url'),
    path       = require('path'),
    config     = processConfig(require('./config.json')),
    couchdb    = require('./couchdb'),
    proxy      = require('./proxy'),
    app        = require('koa')(),
    router     = require('koa-router')(),
    passport    = require('koa-passport'),
    co         = require('co'),
    bodyParser = require('koa-bodyparser'),
    session    = require('koa-session'),
    render     = require('koa-ejs');

var authPlugins = [['google', 'oauth2']];
var auths = [];

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
    startAuthMiddleware();
    yield couchdb.init(config);
    proxy.init(router, config);
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

function startAuthMiddleware() {

    try {
        for (var i = 0; i < authPlugins.length; i++) {
            // check that parameter exists
            var conf;
            if(conf = configExists(authPlugins[i])) {
                console.log('config exists');
                var auth = require('./auth/' + authPlugins[i].join('/') + '/index.js');
                auth.init(passport, router, conf);
                auths.push(auth);
            }
        }
    } catch(e) {
        console.log('Could not get auth middleware...', e.message);
        console.log(e.stack);
    }
}

function *ensureAuthenticated(next) {
    console.log('_passport', this._passport);
    if (this.isAuthenticated()) {
        console.log('authenticated');
        yield next;
        return;
    }
    this.response.redirect('/login');
}

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

function configExists(conf) {
    if(!config.auth) return null;
    var last = config.auth;
    for(var j=0; j<conf.length; j++) {
        if(!last[conf[j]]) return null;
        last = last[conf[j]];
        last.proxy = config.proxy;
    }
    return last;
}


router.get('/login', function*() {
    yield this.render('login', { user: this.session.passport.user });
});

router.get('/logout', function*(){
    this.logout();
    this.redirect('/login');
});

router.get('/account', ensureAuthenticated, function*(){
    yield this.render('account', { user: this.session.passport.user });
});

app.use(function*(next) {
    console.log('session', this.session);
    yield next;
});

app.use(router.routes())
    .use(router.allowedMethods());
