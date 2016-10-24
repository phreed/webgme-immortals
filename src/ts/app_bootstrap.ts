
const gmeConfig = require("./config");
const webgme = require("webgme");

webgme.addToRequireJsPaths(gmeConfig);

const myServer = new webgme.standaloneServer(gmeConfig);
myServer.start(function () {
    // console.log("server up"");
});

