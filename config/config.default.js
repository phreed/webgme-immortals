'use strict';

var config = require('./config.webgme'),
    validateConfig = require('webgme/config/validator');

// Add/overwrite any additional settings here
// config.server.port = 8080;
// config.mongo.uri = 'mongodb://127.0.0.1:27017/webgme_my_app';

// See config.immortals.js for server settings.

config.plugin.allowBrowserExecution = true;
config.plugin.allowServerExecution = false;

config.seedProjects.enable = true;
config.seedProjects.allowDuplication = true;

config.requirejsPaths["bower"] = './bower_components/';
config.requirejsPaths["style"] = './style/';
// need to get https://github.com/GeoKnow/Jassa-Bower/archive/v0.9.0-SNAPSHOT.zip
// so that there can be interaction with Jena

config.visualization.extraCss = ['style/immortals.css'];

config.plugin.basePaths.push('./gen/plugins');
console.log(config.plugin.basePaths);

config.requirejsPaths["cytoscape"] = './bower_components/cytoscape/dist/cytoscape.min';
config.requirejsPaths["serialize"] = './src/serialize/';
config.requirejsPaths["serializer"] = './gen/serializer/';
config.requirejsPaths["text"] = './src/'; // ,'./gen/'];

validateConfig(config);
module.exports = config;
