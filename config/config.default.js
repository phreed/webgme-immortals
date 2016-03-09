'use strict';

var config = require('./config.webgme'),
    validateConfig = require('webgme/config/validator');

// Add/overwrite any additional settings here
// config.server.port = 8080;
// config.mongo.uri = 'mongodb://127.0.0.1:27017/webgme_my_app';

config.plugin.allowBrowserExecution = true;
config.plugin.allowServerExecution = false;
config.seedProjects.enable = true;

config.requirejsPaths["cytoscape"] = './node_modules/cytoscape/dist/';
config.requirejsPaths["bower"] = './bower_modules/';
// need to get https://github.com/GeoKnow/Jassa-Bower/archive/v0.9.0-SNAPSHOT.zip
// so that there can be interaction with Jena

validateConfig(config);
module.exports = config;
