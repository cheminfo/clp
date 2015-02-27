"use strict";

var url = require('url');

module.exports = function(configFile) {
    var config = require(configFile);
    return processConfig(config);
};


function processConfig(config) {
    config.couchUrl = config.couchUrl.replace(/\/$/, '');
    var parsedUrl = url.parse(config.couchUrl);
    config.couchHost = parsedUrl.hostname;
    config.couchPath = parsedUrl.path;
    config.proxy = config.proxy.replace(/\/$/, '');
    return config;
}