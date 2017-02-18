'use strict';

var PassportConfigurator = require('loopback-component-passport').PassportConfigurator;

module.exports = function enableAuthentication(server) {
  // enable authentication
  server.enableAuth();
};