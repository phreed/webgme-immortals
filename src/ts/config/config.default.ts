

import * as config from "webgme/config/config.default";
let validateConfig = require("webgme/config/validator");

// Add/overwrite any additional settings here
// config.server.port = 8080;
// config.mongo.uri = "mongodb://127.0.0.1:27017/webgme_my_app";

// See config.immortals.js for server settings.

config.client.log.level = "debug";

config.plugin.basePaths.push("./dist-client/plugins");
// console.log(config.plugin.basePaths);

config.requirejsPaths["WebGMEGlobal"] = "./dist-client/WebGMEGlobal";
config.requirejsPaths["favicon"] = "img/favicon.ico";

// Visualizer descriptors
config.visualization.panelPaths.push("./dist-client/visualizers/panels");
config.visualization.visualizerDescriptors.push("./src/ts/visualizers/Visualizers.json");

config.requirejsPaths["visualizers/widgets/cytoscape/CytoscapeWidget"] = "./dist-client/visualizers/widgets/cytoscape/CytoscapeWidget";
config.requirejsPaths["panels"] = "./dist-client/visualizers/panels";
config.requirejsPaths["widgets"] = "./dist-client/visualizers/widgets";

config.mongo.uri = "mongodb://127.0.0.1:27017/webgme_immortals";

config.plugin.allowBrowserExecution = true;
config.plugin.allowServerExecution = true;

config.seedProjects.basePaths.push("./src/seeds/immortals");
config.seedProjects.enable = true;
config.seedProjects.allowDuplication = true;

config.requirejsPaths["bower"] = "./bower_components/";
config.requirejsPaths["style"] = "./style";
// need to get 
// https://github.com/GeoKnow/Jassa-Bower/archive/v0.9.0-SNAPSHOT.zip
// so that there can be interaction with Jena

// config.visualization.extraCss = ["./visualizers/widgets/cytoscape/styles/CytoscapeWidget.css"];

config.requirejsPaths["cytoscape"] = "./bower_components/cytoscape/dist/cytoscape.min";
// simply installing n3 as an npm module is insufficient
//  see the 'package.json' script 'postinstall:n3'.
config.requirejsPaths["n3"] = "node_modules/n3/browser/n3-browserify";
config.requirejsPaths["toposort"] = "node_modules/toposort/lib/toposort-browserify";

config.requirejsPaths["serializer"] = "./dist-client/serializer/";
config.requirejsPaths["extract"] = "./dist-client/extract/";
config.requirejsPaths["delivery"] = "./dist-client/delivery/";
config.requirejsPaths["utility"] = "./dist-client/utility/";
// config.requirejsPaths["serializer"] = ["dist-client/serializer/","src/ts/serializer/"];

config.requirejsPaths["plugins/SerializerServerPlugin/metadata"] = "./dist-client/plugins/SerializerServerPlugin/metadata";
config.requirejsPaths["plugins/SerializerClientPlugin/metadata"] = "./dist-client/plugins/SerializerClientPlugin/metadata";

config.requirejsPaths["plugins/PushPlugin/metadata"] = "./dist-client/plugins/PushPlugin/metadata";
config.requirejsPaths["plugins/StreamPlugin/metadata"] = "./dist-client/plugins/StreamPlugin/metadata";

config.storage.disableHashChecks = false;

validateConfig(config);
export = config;
