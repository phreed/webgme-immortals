/* ---------------------
./config/config.immortals.js

In order for this script to be run the NODE_ENV
environment parameter needs to be set.

Add the following to the .bashrc
export NODE_ENV=immortals

- --------------------- */

var config = require('./config.default');
var path = require('path');
var systemdSocket = require('systemd-socket');

config.client.log.level = 'debug';
config.debug = true;
config.server.port = 3000;
config.server.handle = systemdSocket(0);

// configure the logger
console.log(config.server);
config.server.log = {
  //patterns: ['gme:server:*', '-gme:server:standalone*'],
  transports: [{
    transportType: 'Console',
    //patterns: ['gme:server:*', '-gme:server:worker*'],
    // ['gme:server:worker:*'], ['gme:server:*', '-gme:server:worker*']
    options: {
      // Set this back to info when merged
      level: 'debug',
      colorize: true,
      timestamp: true,
      prettyPrint: true,
      handleExceptions: true,
      depth: 2
    }
  }, {
    transportType: 'File',
    options: {
      name: 'info-file',
      filename: './server.log',
      level: 'info',
      json: false,
      prettyPrint: true
    }
  }, {
    transportType: 'File',
    options: {
      name: 'error-file',
      filename: './server-error.log',
      level: 'error',
      handleExceptions: true,
      json: false,
      prettyPrint: true
    }
  }]
};

config.authentication.enable = true;
config.authentication.jwt.privateKey = path.join(__dirname, '../..', 'token_keys', 'private_key');
config.authentication.jwt.publicKey = path.join(__dirname, '../..', 'token_keys', 'public_key');
config.authentication.logInUrl = '/profile/login';
config.authentication.logOutUrl = '/profile/login';

module.exports = config;
