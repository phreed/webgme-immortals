
const requirejs = require("requirejs");

requirejs.config({
    // Pass the top-level main.js/index.js require
    // function to requirejs so that node modules
    // are loaded relative to the top-level JS file.
    nodeRequire: require
});

const gmeConfig = requirejs("./config/config.immortals");
const webgme = requirejs("webgme");

webgme.addToRequireJsPaths(gmeConfig);

const myServer = new webgme.standaloneServer(gmeConfig);
myServer.start(function () {
    // console.log("server up"");
});

