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

    // Get a document
    router.get('/' + config.couchDatabase + '/:id', auth.ensureAuthenticated, getDocument(true), auth.ensureIsPublicOrEmailMatches, changeHost, addAuthCookie, proxy({host: config.couchUrl}));

    // Create new document. No need to check that email matches.
    router.put('/' + config.couchDatabase + '/:id', auth.ensureAuthenticated, getDocument(false), changeHost, addAuthCookie, proxy({
        host: config.couchUrl
    }));

    // Views users can access with access limited to their own email
    router.get('/' + config.couchDatabase + '/_design/flavor/_view/list', auth.ensureAuthenticated, handleList);
    router.get('/' + config.couchDatabase + '/_design/flavor/_list/sort/docs', auth.ensureAuthenticated, function*() {
        // We ignore the key parameter that is sent
        // We enforce the key to be the email of the logged user
        try {
            var flavor, doc, headers;
            var query = this.request.query;
            var key = query.key;
            if(key) key = JSON.parse(key);

            if(key instanceof Array) {
                key[1] = auth.getUserEmail(this);
                key[0] = key[0] || 'default';
            }
            query.key = key;
            var res = yield couchdb.db.viewWithList('flavor', 'docs', 'sort', query);

            doc = res[0];
            headers = res[1];
            this.response.body = doc;
            this.set(headers);


        } catch(e) {
            error.handleError(this, e);
        }
    });

    function *handleList() {
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
    }

    // List users can access, limited to their own email.
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

    // View to with users have access, limit to their own email.
    router.get('/' + config.couchDatabase + '/_design/flavor/_view/docs', auth.ensureAuthenticated, function*() {
        // We ignore the key parameter that is sent
        // We enforce the key to be the email of the logged user
        try {
            var flavor, doc, headers;
            var query = this.request.query;
            var key = query.key;
            if(key) key = JSON.parse(key);

            if(key instanceof Array) {
                key[1] = auth.getUserEmail(this);
                key[0] = key[0] || 'default';
            }
            query.key = key;
            var res = yield couchdb.db.view('flavor', 'docs', query);

            // Grant access
            doc = res[0];
            headers = res[1];
            this.response.body = doc;
            this.set(headers);


        } catch(e) {
            error.handleError(this, e);
        }
    });

    // Get an attachment. Work with /-separated attachment names
    router.get('/' + config.couchDatabase + '/:id/:attachment+', auth.ensureAuthenticated, getDocument(true),  auth.ensureIsPublicOrEmailMatches, changeHost, addAuthCookie, proxy({
        host: config.couchUrl
    }));

    // Save an attachment. Works with /-separated attachment names
    router.put('/' + config.couchDatabase + '/:id/:attachment+', auth.ensureAuthenticated, getDocument(true), auth.ensureEmailMatches, changeHost, addAuthCookie, proxy({
        host: config.couchUrl
    }));
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
            if(!treatMissingAsError && e.reason === 'missing') {
                this.state.couchdb.document = null;
            }
            else {
                return error.handleError(this, e);
            }
        }
        yield next;
    }
}
