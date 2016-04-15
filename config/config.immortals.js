/* ---------------------
./config/config.immortals.js

In order for this script to be run the NODE_ENV
environment parameter needs to be set.

Add the following to the .bashrc
export NODE_ENV=immortals

- --------------------- */

var config = require('./config.default');

// config.addOns.enable = true;
// config.addOns.basePaths.push('C:/addons');
config.server.port = 3000;
var transports = config.server.log.transports;
var info_files = transports.filter(function(it) { return it.name === 'info-file' });
if (info_files.length > 0) info_files[0].options.filename = '/tmp/server-info.log';

var error_files = transports.filter(function(it) { return it.name === 'error-file' });
if (error_files.length > 0) error_files[0].options.filename = '/tmp/server-info.log';

config.authentication.enable = true;
config.authentication.logOutUrl = '/login';

module.exports = config;
