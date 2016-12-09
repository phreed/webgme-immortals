

/*
Configuration of requirejs happens in the webgme module.
*/
require("amdefine/intercept");
try {
    const gmeConfig = require("../config/config.immortals");
    const webgme = require("webgme");

    webgme.addToRequireJsPaths(gmeConfig);

    const myServer = new webgme.standaloneServer(gmeConfig);
    myServer.start(function () {
        // console.log("server up"");
    });
} catch (err) {
    console.log(`exception: ${err.message}`);
    console.log(`stack: ${err.stack}`);
}

