/*jshint node: true*/
/**
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */

let env = process.env.NODE_ENV || "default";
let configFilename = `${__dirname}/config.${env}.js`;
export let config = require(configFilename);
let validateConfig = require("webgme/config/validator");

validateConfig(configFilename);
