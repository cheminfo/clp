"use strict";
var proxy          = require('koa-proxy'),
    _              = require('lodash'),
    routesNoLog    = ['/','/_uuids'],
    routesWithLog  = [],
    couchdb        = require('./couchdb'),
    auth           = require('./auth'),
    error          = require('./error');


var exp = module.exports = {};

exp.init = function(router, config) {
    for(var i=0; i<routesNoLog.length; i++) {
        router.get(routesNoLog[i], changeHost, proxy({
            url: config.couchUrl + routesNoLog[i]
        }))
    }

    for(i=0; i<routesWithLog.length; i++) {
        router.get(routesWithLog[i], addAuthCookie, proxy({
            url: config.couchUrl + routesWithLog[i]
        }))
    }

    function *changeHost(next) {
        this.headers.host = config.couchHost;
        yield next;
    }

    function *addAuthCookie(next) {
        this.headers.host = config.couchHost;
        this.headers.cookie = couchdb.authCookie;
        yield next;
    }

    router.get('/' + config.couchDatabase + '/:id', auth.ensureAuthenticated, getDocument(true), auth.ensureIsPublicOrEmailMatches, changeHost, addAuthCookie, proxy({host: config.couchUrl}));


    router.get('/' + config.couchDatabase + '/:id/:attachment', auth.ensureAuthenticated, getDocument(true),  auth.ensureIsPublicOrEmailMatches, changeHost, addAuthCookie, proxy({
        host: config.couchUrl
    }));

    router.put('/' + config.couchDatabase + '/:id', auth.ensureAuthenticated, getDocument(false), auth.ensureCanBeWritten, changeHost, addAuthCookie, proxy({
        host: config.couchUrl
    }));

    router.put('/' + config.couchDatabase + '/:id/:attachment', auth.ensureAuthenticated, getDocument(true), auth.ensureEmailMatches, changeHost, addAuthCookie, proxy({
        host: config.couchUrl
    }));


    router.get('/' + config.couchDatabase + '/_design/flavor/_view/list', auth.ensureAuthenticated, function*() {
        // We ignore the key parameter that is sent
        // We enforce the key to be the email of the logged user
        try {
            var doc, headers;
            var email = auth.getUserEmail(this);
            var res = yield couchdb.db.view('flavor', 'list', {key: email});

            // Grant access
            doc = res[0];
            headers = res[1];
            this.response.body = doc;
            this.set(headers);

        } catch(e) {
            error.handleError(this, e);
        }
    });

    router.get('/' + config.couchDatabase + '/_design/flavor/_list/config/alldocs', auth.ensureAuthenticated, function*() {
        // We ignore the key parameter that is sent
        // We enforce the key to be the email of the logged user
        try {
            var doc, headers;
            var email = auth.getUserEmail(this);
            var res = yield couchdb.db.viewWithList('flavor', 'alldocs', 'config', {key: email});

            // Grant access
            doc = res[0];
            headers = res[1];
            this.response.body = doc;
            this.set(headers);


        } catch(e) {
            error.handleError(this, '', e);
        }
    });

    router.get('/' + config.couchDatabase + '/_design/flavor/_view/docs', auth.ensureAuthenticated, function*() {
        // We ignore the key parameter that is sent
        // We enforce the key to be the email of the logged user
        try {
            var flavor, doc, headers;
            var key = this.request.query.key;
            if(key) key = JSON.parse(key);
            if(key instanceof Array)
                flavor = key[0];
            else
                flavor = 'default';

            var email = auth.getUserEmail(this);
            var res = yield couchdb.db.view('flavor', 'docs', {key: [flavor, 'admin@cheminfo.org']});

            // Grant access
            doc = res[0];
            headers = res[1];
            console.log(headers);
            this.response.body = doc;
            this.set(headers);


        } catch(e) {
            error.handleError(this, e);
        }
    });
};

function getDocument(treatMissingAsError) {
    return function *(next) {
        try{
            this.state.couchdb = {};
            var res = yield couchdb.db.get(this.params.id);
            this.state.couchdb.document = res[0];
            this.state.couchdb.headers = res[1];
        }
        catch(e) {
            if(!treatMissingAsError && e.reason === 'not_found') {
                this.state.couchdb.document = null;
            }
            else {
                return error.handleError(this, e);
            }
        }
        yield next;
    }
}




//function emailMatches(ctx, doc) {
//    var emails = _.pluck(ctx.session.passport.user.emails, 'value');
//    console.log(emails);
//    return emails.indexOf(doc.name) > -1;
//}
