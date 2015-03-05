'use strict';
var error = require('./error');

var authPlugins = [['google', 'oauth2'],['couchdb'], ['facebook', 'oauth2'],['github','oauth2']];
var auths = [];

var exp = module.exports = {};

exp.init = function(passport, router, config) {
        for (var i = 0; i < authPlugins.length; i++) {
            try {
                console.log(authPlugins[i]);
                // check that parameter exists
                var conf;
                if(conf = configExists(authPlugins[i])) {
                    console.log('loading auth plugin', authPlugins[i]);
                    var auth = require('./auth/' + authPlugins[i].join('/') + '/index.js');
                    auth.init(passport, router, conf);
                    auths.push(auth);
                }
                else {
                    console.log('Auth plugin does not exist', authPlugins[i]);
                }
            } catch(e) {
                console.log('Could not init auth middleware...', e.message);
                console.log(e.stack);
            }
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
            last.couchUrl = config.couchUrl;
        }
        return last;
    }


    router.get('/login', function*() {
        yield this.render('login', { user: this.session.passport.user , config:config, authPlugins: authPlugins});
    });


    router.get('/account', this.ensureAuthenticated, function*(){
        yield this.render('account', { user: this.session.passport.user });
    });

    router.get('/_session', function*(next){
        var that = this;
        // Check if session exists
            this.body = JSON.stringify({
                ok: true,
                userCtx: {
                    name: exp.getUserEmail(that)
                }
            });
        yield next;
    });

    router.delete('/_session', function*(){
        this.logout();
        this.body = JSON.stringify({
            ok: true
        });
    });
};

exp.ensureAuthenticated = function *(next) {
    console.log('ensure authenticated');
    if (this.isAuthenticated()) {
        yield next;
        return;
    }
    console.log('not authenticated');
    this.response.redirect('/login');
};

exp.getUserEmail = function(ctx) {
    var user = ctx.session.passport.user;
    if(!user) return null;
    var email;
    switch(user.provider) {
        case 'github':
            email = user._json.email;
            break;
        case 'google':
            if(user._json.verified_email === true)
                email = user._json.email;
            else
                email = null;
            break;
        case 'facebook':
            if(user._json.verified === true) {
                email = user._json.email;
            }
            else {
                email = null;
            }
            break;
        case 'local':
            email = user.email;
            break;
        case 'couchdb':
            email  = user.email || null;
            break;
        default:
            email = null;
            break;
    }
    return email;
};

exp.emailMatches = function(ctx, email) {
    var sessionEmail = this.getUserEmail(ctx);
    return email.toLowerCase() === sessionEmail.toLowerCase();
};

exp.ensureEmailMatches = function*(next) {
    console.log('ensure email matches');
    try{
        var name = this.state.couchdb.document.name;

    }
    catch(e) {
        return this.statusCode(500);
    }
    var sessionEmail = exp.getUserEmail(this);
    if(compareEmails(sessionEmail, name))
        yield next;
    else
        error.handleError('private');
};

exp.ensureIsPublic = function*(next) {
    console.log('ensure public');
    try{
        var isPublic = this.state.couchdb.document.public;
    }
    catch(e) {
        return this.statusCode(500);
    }
    if(isPublic === true) {
        yield next;
    }
    else {
        error.handleError(this, 'private');
    }
};

exp.ensureIsPublicOrEmailMatches = function*(next) {
    console.log('ensure public or email matches');
    var isPublic = this.state.couchdb.document.public;
    var name = this.state.couchdb.document.name;
    var sessionEmail = exp.getUserEmail(this);
    if(isPublic || compareEmails(sessionEmail, name))
        yield next;
    else {
        error.handleError(this, 'private');
    }
};

exp.ensureCanBeWritten = function*(next) {
    console.log('ensure can be written', this.request.body);
    yield next;
};

exp.ensureDocIsSafe = function*(next) {
    console.log('ensure doc is safe');
    if(this.request.body._attachments) {
        try {
            // Go through all the attachments and parse them as json
            for (var key in this.request.body._attachments) {
                JSON.parse((new Buffer(this.request.body._attachments[key].data, 'base64')).toString());
            }
        } catch(e) {
            this.statusCode = 400;
            return;
        }
    }
    yield next;
};

exp.ensureAttachmentIsJson = function*(next) {
    console.log('ensure attachment is json');
    if(typeof this.request.body === 'object') {
        return yield next;
    }
    try {
        JSON.parse(this.request.body);
    } catch(e) {
        this.statusCode = 400;
        return;
    }
    yield next;
};

function compareEmails(a, b) {
    console.log(a,b);
    return a.toLowerCase() === b.toLowerCase();
}