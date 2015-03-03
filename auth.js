'use strict';
// Structure of the passport session object (this.session.passport)
// provided by passport-google-oauth2

//{
//    "user": {
//        "provider": "google",
//            "id": "100982963740157602406",
//            "displayName": "Daniel Kostro",
//            "name": {
//            "familyName": "Kostro",
//            "givenName": "Daniel"
//        },
//        "emails": [
//            {
//                "value": "kostro.d@gmail.com"
//            }
//        ],
//        "_raw": "{\n \"id\": \"100982963740157602406\",\n \"email\": \"kostro.d@gmail.com\",\n \"verified_email\": true,\n \"name\": \"Daniel Kostro\",\n \"given_name\": \"Daniel\",\n \"family_name\": \"Kostro\",\n \"link\": \"https://plus.google.com/+DanielKostro\",\n \"picture\": \"https://lh3.googleusercontent.com/-IvcZEni7cxM/AAAAAAAAAAI/AAAAAAAACso/4Zy9vw_ucks/photo.jpg\",\n \"gender\": \"male\"\n}\n",
//        "_json": {
//        "id": "100982963740157602406",
//        "email": "kostro.d@gmail.com",
//        "verified_email": true,
//        "name": "Daniel Kostro",
//        "given_name": "Daniel",
//        "family_name": "Kostro",
//        "link": "https://plus.google.com/+DanielKostro",
//        "picture": "https://lh3.googleusercontent.com/-IvcZEni7cxM/AAAAAAAAAAI/AAAAAAAACso/4Zy9vw_ucks/photo.jpg",
//        "gender": "male"
//    }
//}
//}

var error = require('./error');

var authPlugins = [['google', 'oauth2'],['couchdb']];
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
        yield this.render('login', { user: this.session.passport.user });
    });

    router.get('/logout', function*(){
        this.logout();
        this.redirect('/login');
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
    })
};

exp.ensureAuthenticated = function *(next) {
    console.log(this.session.passport);
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
        case 'google':
            if(user._json.verified_email === true)
                email = user._json.email;
            else
                email = null;
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
    try{
        var name = this.state.couchdb.document.name;

    }
    catch(e) {
        return this.statusCode(500);
    }
    var sessionEmail = this.getUserEmail(this);
    if(compareEmails(sessionEmail, name))
        yield next;
    else
        error.handleError('private');
};

exp.ensureIsPublic = function*(next) {
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
    var isPublic = this.state.couchdb.document.public;
    var name = this.state.couchdb.document.name;
    var sessionEmail = exp.getUserEmail(this);
    name = 'kostro.d@gmail.com';
    if(isPublic || compareEmails(sessionEmail, name))
        yield next;
    else {
        error.handleError(this, 'private');
    }
};

exp.ensureCanBeWritten = function*(next) {
    yield next;
};

function compareEmails(a, b) {
    console.log(a,b);
    return a.toLowerCase() === b.toLowerCase();
}