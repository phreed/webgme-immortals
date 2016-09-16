// jshint node: true

'use strict';

var gmeConfig = require('./config'),
    webgme = require('webgme'),
    myServer;

webgme.addToRequireJsPaths(gmeConfig);

myServer = new webgme.standaloneServer(gmeConfig);
myServer.start(function () {
    //console.log('server up');
});

// import gmeConfig = require('./config');
//var gmeConfig = require('./config'),
//    webgme = require('webgme'),
//    myServer;

/*
import webgme = require('webgme');

webgme.addToRequireJsPaths(gmeConfig);

myServer = new webgme.standaloneServer(gmeConfig);
myServer.start(function () {
    //console.log('server up');
});
*/
