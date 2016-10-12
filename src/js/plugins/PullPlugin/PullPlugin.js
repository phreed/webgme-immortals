/*globals define*/
/*jshint node:true, browser:true*/

/**
 * Generated by PluginGenerator 0.14.0 from webgme on Mon Dec 14 2015 15:14:56 GMT-0600 (CST).
 */

define([
  'plugin/PluginConfig',
  'plugin/PluginBase',
  'jszip',
  'xmljsonconverter'
], function(
  PluginConfig,
  PluginBase,
  JSZip,
  Converter) {
  'use strict';

  /**
   * Initializes a new instance of pull.
   * @class
   * @augments {PluginBase}
   * @classdesc This class represents the plugin pull.
   * @constructor
   */
  var PullPlugin = function() {
    // Call base class' constructor.
    PluginBase.call(this);
  };

  // Prototypal inheritance from PluginBase.
  pull.prototype = Object.create(PluginBase.prototype);
  pull.prototype.constructor = pull;

  /**
   * Gets the name of the pull.
   * @returns {string} The name of the plugin.
   * @public
   */
  pull.prototype.getName = function() {
    return 'pull';
  };

  /**
   * Gets the semantic version (semver.org) of the pull.
   * @returns {string} The version of the plugin.
   * @public
   */
  pull.prototype.getVersion = function() {
    return '0.1.0';
  };

  /**
   * Gets the configuration structure for the pull.
   * The ConfigurationStructure defines the configuration for the plugin
   * and will be used to populate the GUI when invoking the plugin from webGME.
   * @returns {object} The version of the plugin.
   * @public
   */
  pull.prototype.getConfigStructure = function() {
    return [{
      name: 'mode',
      displayName: 'Mode file or websocket',
      description: 'Are we importing a file or making an extract from the super model?',
      value: 'file',
      valueType: 'string',
      valueItems: [
        'file',
        'websocket'
      ]
    }, {
      name: 'deliveryUrl',
      displayName: 'graph db host IP address or name',
      // regex: '^[a-zA-Z]+$',
      // regexMessage: 'Name can only contain latin characters!',
      // ValidHostnameRegex = "^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$";
      // ValidIpAddressRegex = "^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$";
      description: 'What is the ip address or name of the host for the graph database multi-model.',
      value: '127.0.0.1',
      valueType: 'string',
      readOnly: false
    }, {
      name: 'query',
      displayName: 'extract sub-model',
      description: 'Model extraction from system Multi-Model.',
      value: '',
      valueType: 'string',
      readOnly: false
    }, {
      name: 'file',
      displayName: 'graph model',
      description: 'click and drag file .',
      value: 'default_graph.json',
      valueType: 'asset',
      readOnly: false
    }];
  };


  /**
    Main function for the plugin to execute. This will perform the execution.
    Notes:
    - Always log with the provided logger.[error,warning,info,debug].
    - Do NOT put any user interaction logic UI, etc. inside this method.
    - callback always has to be called even if error happened.

    When this runs the core api is used to extract the meta-model and
    the model instance from the system multi-model. The super-model contains
    all of the models used to describe the target system.
    The current model is replacd with the requested model.

   * @param {function(string, plugin.PluginResult)} callback - the result callback
   */
  pull.prototype.main = function(callback) {
    // Use self to access core, project, result, logger etc from PluginBase.
    // These are all instantiated at this point.

    var self = this,
      // nodeObject = self.activeNode;
      baseNode = self.core.getBase(),
      currentConfig = self.getCurrentConfig();

    switch (self.currentConfig.mode) {
      case 'file':
        if (!self.currentConfig.file) {
          callback(new Error('No file provided.'), self.result);
          return;
        }
        self.blobClient.getObject(self.currentConfig.file, saveFile);
        break;
      case 'websocket':
        if (!self.currentConfig.deliveryUrl) {
          callback(new Error('No host address provided.'), self.result);
          return;
        }
        self.blobClient.getObject(self.currentConfig.file, saveWebsocket);
        break;
      default:
        callback(new Error('unknown mode provided.'), self.result);
        return;
    }

    self.blobClient.getObject(currentConfig.file, function(err, jsonOrBuf) {
      var dataModel;
      if (err) {
        callback(err);
        return;
      }

      if (typeof Buffer !== 'undefined' && jsonOrBuf instanceof Buffer) {
        // This clause is entered when the plugin in executed in a node process (on the server) rather than
        // in a browser. Then the getObject returns a Buffer and we need to convert it to string and then
        // parse it into an object.
        try {
          jsonOrBuf = String.fromCharCode.apply(null, new Uint8Array(jsonOrBuf));
          dataModel = JSON.parse(jsonOrBuf);
        } catch (err) {
          callback(err, self.result);
          return;
        }
      } else {
        // In the browser the getObject automatically returns a json object.
        dataModel = jsonOrBuf;
      }

      self.logger.info('Obtained dataModel', dataModel);
      self.buildUpFMDiagram(dataModel, function(err) {
        if (err) {
          callback(err, self.result);
          return;
        }

        self.save('FSM Importer created new model.', function(err) {
          if (err) {
            callback(err, self.result);
            return;
          }

          self.result.setSuccess(true);
          callback(null, self.result);
        });
      })
    });


    // This will save the changes. If you don't want to save;
    // exclude self.save and call callback directly from this scope.
    self.save('pull updated model.', function(err) {
      if (err) {
        callback(err, self.result);
        return;
      }
      self.result.setSuccess(true);
      callback(null, self.result);
    });

  };

  return pull;
});
