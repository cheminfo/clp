"use strict";
var proxy          = require('koa-proxy'),
    routesNoLog    = ['/','/_uuids'],
    routesWithLog  = ['/c/_design/flavor/_view/docs'],
    couchdb        = require('./couchdb'),
    _              = require('lodash');


var exp = module.exports = {};

function handleError(ctx, code, error) {
    if(code instanceof Error) {
        error = code;
        code = null;
    }
    error = error || {};
    var err;
    var errCode;
    console.log(code);
    switch(code) {
        case 'private':
            err =  {
                error: 'unauthorized',
                reason: 'The resource is private'
            };
            errCode = 401;
            break;
        case 'readonly':
            err = {
                error: 'unauthorized',
                reason: 'The resource is readonly'
            };
            errCode = 401;
            break;
        default:
            err = {
                error: 'unauthorized',
                reason: 'Unknown'
            };
            errCode = 401;
            break;
    }
    errCode = error.statusCode || errCode;
    err.reason = error.reason || err.reason;
    err.error = error.error || err.error;
    ctx.response.body = JSON.stringify(err);
    ctx.response.status = errCode;
}

exp.init = function(router, config) {
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

    router.get('/' + config.couchDatabase + '/:id', function*() {
        try{
            var doc, headers;
            var res = yield couchdb.db.get(this.params.id);
            //if(res[0] instanceof Error) {
            //    console.log(res[0]);
            //    throw res[0];
            //}

            doc = res[0];
            headers = res[1];

            var match = emailMatches(this, doc);
            console.log('email matches...');
            if(doc.public === false && !match) {
                return handleError(this, 'private');
            }

            // Grant access
            this.response.body = doc;
            this.set(headers);
        }
        catch(e) {
            console.log(e);
            handleError(this, '', e);
        }
    });
};

function emailMatches(ctx, doc) {
    console.log('hello....');
    var emails = _.pluck(ctx.session.passport.user.emails, 'value');
    console.log(emails);
    return emails.indexOf(doc.name) > -1;
}