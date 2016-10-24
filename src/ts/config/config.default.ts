
var config = require("./config.webgme");
var validateConfig = require("webgme/config/validator");

// Add/overwrite any additional settings here
// config.server.port = 8080;
// config.mongo.uri = "mongodb://127.0.0.1:27017/webgme_my_app";

// See config.immortals.js for server settings.

config.client.log.level = "debug";

config.plugin.allowBrowserExecution = true;
config.plugin.allowServerExecution = true;

config.seedProjects.enable = true;
config.seedProjects.allowDuplication = true;

config.requirejsPaths["bower"] = "./bower_components/";
config.requirejsPaths["style"] = "./style/";
// need to get https://github.com/GeoKnow/Jassa-Bower/archive/v0.9.0-SNAPSHOT.zip
// so that there can be interaction with Jena

config.visualization.extraCss = ["style/immortals.css"];

config.plugin.basePaths.push("./gen/plugins", "./src/ts", "./src/js");
console.log(config.plugin.basePaths);

config.requirejsPaths["cytoscape"] = "./bower_components/cytoscape/dist/cytoscape.min";
config.requirejsPaths["bluebird"] = "./node_modules/bluebird/js/browser/bluebird";
// simply installing n3 as an npm module is insufficient
// npm install n3
// cd node_modules/n3
// npm install
// npm run browser
config.requirejsPaths["n3"] = "node_modules/n3/browser/n3-browserify";

config.requirejsPaths["serialize"] = "./src/js/serialize/";

config.requirejsPaths["serializer"] = "./gen/serializer/";
config.requirejsPaths["extract"] = "./gen/extract/";
config.requirejsPaths["delivery"] = "./gen/delivery/";
config.requirejsPaths["utility"] = "./gen/utility/";
// config.requirejsPaths["serializer"] = ["gen/serializer/","src/ts/serializer/"];

config.requirejsPaths["plugins/SerializerServerPlugin/metadata"] = "./gen/plugins/SerializerServerPlugin/metadata";
config.requirejsPaths["plugins/SerializerClientPlugin/metadata"] = "./gen/plugins/SerializerClientPlugin/metadata";

config.requirejsPaths["plugins/PushPlugin/metadata"] = "./gen/plugins/PushPlugin/metadata";
config.requirejsPaths["plugins/StreamPlugin/metadata"] = "./gen/plugins/StreamPlugin/metadata";

validateConfig(config);
module.exports = config;
