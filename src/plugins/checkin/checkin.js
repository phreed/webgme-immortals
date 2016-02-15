/*globals define*/
/*jshint node:true, browser:true*/

/**
 Copyright Fred Eisele 2015
 */

define([
  'plugin/PluginConfig',
  'plugin/PluginBase'
], function(
  PluginConfig,
  PluginBase) {
  'use strict';

  /**
   * Initializes a new instance of checkin.
   * @class
   * @augments {PluginBase}
   * @classdesc This class represents the plugin checkin.
   * @constructor
   */
  var checkin = function() {
    // Call base class' constructor.
    PluginBase.call(this);
  };

  // Prototypal inheritance from PluginBase.
  checkin.prototype = Object.create(PluginBase.prototype);
  checkin.prototype.constructor = checkin;

  /**
   * Gets the name of the checkin.
   * @returns {string} The name of the plugin.
   * @public
   */
  checkin.prototype.getName = function() {
    return 'checkin';
  };

  /**
   * Gets the semantic version (semver.org) of the checkin.
   * @returns {string} The version of the plugin.
   * @public
   */
  checkin.prototype.getVersion = function() {
    return '0.1.0';
  };
  /**
   * Gets the configuration structure for the foo.
   * The ConfigurationStructure defines the configuration for the plugin
   * and will be used to populate the GUI when invoking the plugin from webGME.
   * @returns {object} The version of the plugin.
   * @public
   */
  checkin.prototype.getConfigStructure = function() {
    return [{
      name: 'mode',
      displayName: 'Mode file or websocket',
      description: '',
      value: 'file',
      valueType: 'string',
      valueItems: [
        'file',
        'websocket'
      ]
    }, {
      name: 'hostAddr',
      displayName: 'graph db host IP address or name',
      // regex: '^[a-zA-Z]+$',
      // regexMessage: 'Name can only contain English characters!',
      description: 'What is the ip address or name of the host for the ' + 'graph database multi-model.',
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

    When this runs the core api is used to extract the essential
    meta-model and the model instance, these are then written to the multi-model.
    The multi-model contains all of the models used to describe the target system.

    https://github.com/ptaoussanis/sente
    and https://github.com/cognitect/transit-format
    will be used to connect to the
    graph database (tinkerpop3) where the multi-model is stored.

    @param {function(string, plugin.PluginResult)} callback - the result callback
   */
  checkin.prototype.main = function(callback) {
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
        self.blobClient.getObject(self.currentConfig.file, function (err, objectValue) {
            var dataModel;
            if (err) {
                callback(err);
                return;
            }
            dataModel = self.regularize(objectValue);


            self.logger.info('Obtained dataModel', dataModel);
            self.buildUpFMDiagram(dataModel, function (err) {
                if (err) {
                    callback(err, self.result);
                    return;
                }

                self.save('FSM Importer created new model.', function (err) {
                    if (err) {
                        callback(err, self.result);
                        return;
                    }

                    self.result.setSuccess(true);
                    callback(null, self.result);
                });
            })
        };);
        break;
      case 'websocket':
        if (!self.currentConfig.hostAddr) {
          callback(new Error('No host address provided.'), self.result);
          return;
        }
        self.blobClient.getDownloadURL(self.currentConfig.hostAddr, saveWebsocket);
        break;
      default:
        callback(new Error('unknown mode provided.'), self.result);
        return;
    }


    // Using the logger.
    self.logger.debug('This is a debug message.');
    self.logger.info('This is an info message.');
    self.logger.warn('This is a warning message.');
    self.logger.error('This is an error message.');


    // extract the meta-model

    // extract the model-instance
    self.core.setAttribute(nodeObject, 'name', 'My new obj');
    self.core.setRegistry(nodeObject, 'position', {
      x: 70,
      y: 70
    });


    // This will save the changes. If you don't want to save;
    // exclude self.save and call callback directly from this scope.
    self.save('checkin updated model.', function(err) {
      if (err) {
        callback(err, self.result);
        return;
      }
      self.result.setSuccess(true);
      callback(null, self.result);
    });

  };

  return checkin;
});
