'use strict';
var authPlugins = [['google', 'oauth2']];
var auths = [];

var exp = module.exports = {};

exp.init = function(passport, router, config) {

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

    function *ensureAuthenticated(next) {
        if (this.isAuthenticated()) {
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
};

