"use strict";
var proxy      = require('koa-proxy');
var routesNoLog = ['/','/_uuids'];
var routesWithLog = ['/c/_design/flavor/_view/docs'];


var exp = module.exports = {};

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
};