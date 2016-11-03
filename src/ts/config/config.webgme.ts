
import * as config from "webgme/config/config.default";
let validateConfig = require("webgme/config/validator");

// The paths can be loaded from the webgme-setup.json
config.plugin.basePaths.push("dist/plugins");
config.seedProjects.basePaths.push("src/seeds/immortals");

config.visualization.panelPaths.push("dist/visualizers/panels");

// Visualizer descriptors
config.visualization.visualizerDescriptors.push("./src/ts/visualizers/Visualizers.json");
// Add requirejs paths
config.requirejsPaths["panels"] = "./dist/visualizers/panels";
config.requirejsPaths["widgets"] = "./dist/visualizers/widgets";

config.mongo.uri = "mongodb://127.0.0.1:27017/webgme_immortals";
validateConfig(config);
export = config;
