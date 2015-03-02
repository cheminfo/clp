'use strict';
// Structure of the passport session object (this.session.passport)
// provided by passport-google-oauth2

//{
//    "user": {
//    "provider": "google",
//        "id": "100982963740157602406",
//        "displayName": "Daniel Kostro",
//        "name": {
//        "familyName": "Kostro",
//        "givenName": "Daniel"
//    },
//    "emails": [
//        {
//            "value": "kostro.d@gmail.com"
//        }
//    ],
//        "_raw": "{\n \"id\": \"100982963740157602406\",\n \"email\": \"kostro.d@gmail.com\",\n \"verified_email\": true,\n \"name\": \"Daniel Kostro\",\n \"given_name\": \"Daniel\",\n \"family_name\": \"Kostro\",\n \"link\": \"https://plus.google.com/+DanielKostro\",\n \"picture\": \"https://lh3.googleusercontent.com/-IvcZEni7cxM/AAAAAAAAAAI/AAAAAAAACso/4Zy9vw_ucks/photo.jpg\",\n \"gender\": \"male\"\n}\n",
//        "_json": {
//        "id": "100982963740157602406",
//            "email": "kostro.d@gmail.com",
//            "verified_email": true,
//            "name": "Daniel Kostro",
//            "given_name": "Daniel",
//            "family_name": "Kostro",
//            "link": "https://plus.google.com/+DanielKostro",
//            "picture": "https://lh3.googleusercontent.com/-IvcZEni7cxM/AAAAAAAAAAI/AAAAAAAACso/4Zy9vw_ucks/photo.jpg",
//            "gender": "male"
//    }
//}
//}

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

    router.get('/account', this.ensureAuthenticated, function*(){
        yield this.render('account', { user: this.session.passport.user });
    });
};

exp.ensureAuthenticated = function *(next) {
    if (this.isAuthenticated()) {
        yield next;
        return;
    }
    this.response.redirect('/login');
};

