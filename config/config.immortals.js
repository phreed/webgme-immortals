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
config.server.port = 3000

module.exports = config;

