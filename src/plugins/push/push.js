/*globals define*/
/*jshint node:true, browser:true*/

/**
 Copyright Fred Eisele 2015
 */

define([
  'plugin/PluginConfig',
  'plugin/PluginBase',
  'common/core/users/newserialization',
  'serialize/FlatSerializer',
  'blob/BlobMetadata',
  'blob/util',
  'q'
], function(
  PluginConfig,
  PluginBase,
  newserialization,
  FlatSerializer,
  BlobMetadata,
  Q) {
  'use strict';

  /**
   * Initializes a new instance of push.
   * @class
   * @augments {PluginBase}
   * @classdesc This class represents the plugin push.
   * @constructor
   */
  var push = function() {
    // Call base class' constructor.
    PluginBase.call(this);
  };

  // Prototypal inheritance from PluginBase.
  push.prototype = Object.create(PluginBase.prototype);
  push.prototype.constructor = push;

  /**
   * Gets the name of the push.
   * @returns {string} The name of the plugin.
   * @public
   */
  push.prototype.getName = function() {
    return 'push';
  };

  /**
   * Gets the semantic version (semver.org) of the push.
   * @returns {string} The version of the plugin.
   * @public
   */
  push.prototype.getVersion = function() {
    return '0.1.0';
  };

  /**
   * Gets the description of the push plugin.
   * @returns {string} The description of the plugin.
   * @public
   */
  push.prototype.getDescription = function() {
    return 'Example of how to push a data-model from webgme.\n' +
      'The active node (i.e. open node on the canvas) will be the starting point, ' +
      'expect when importing a project.';
  };
  /**
   * Gets the configuration structure for the foo.
   * The ConfigurationStructure defines the configuration for the plugin
   * and will be used to populate the GUI when invoking the plugin from webGME.
   * @returns {object} The version of the plugin.
   * @public
   */
  push.prototype.getConfigStructure = function() {
    return [{
      name: 'deliveryMode',
      displayName: 'Mode file or websocket',
      description: '',
      value: 'file',
      valueType: 'string',
      valueItems: [
        'file',
        'websocket'
      ]
    }, {
      name: 'typedVersion',
      displayName: 'TypedVersion',
      description: 'Specify the type and version to be used.',
      value: 'json-flat:1.0.0',
      valueType: 'string',
      valueItems: [
        'json-flat:1.0.0',
        'json-tree:1.0.0'
      ]
    }, {
      name: 'hostAddr',
      displayName: 'graph db host IP address or name',
      // regex: '^[a-zA-Z]+$',
      // regexMessage: 'Name can only contain English characters!',
      description: 'What is the ip address or name of the host for the ' + 'graph database mega-model.',
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
      name: 'fileName',
      displayName: 'graph model file name',
      description: 'click and drag file .',
      value: 'default_graph.json',
      valueType: 'string',
      readOnly: false
    }];
  };

  /**
    Main function for the plugin to execute.
    Notes:
    - Always log with the provided logger.[error,warning,info,debug].
    - Do NOT put any user interaction logic UI, etc. inside this method.
    - handler always has to be called even if error happened.

    When this runs the core api is used to extract the essential
    meta-model and the model-instance, these are then written to the mega-model.
    The mega-model contains all of the models used to describe the target system.

    https://github.com/ptaoussanis/sente
    and https://github.com/cognitect/transit-format
    will be used to connect to the
    graph database (immortals) where the mega-model is stored.

    @param {function(string, plugin.PluginResult)} handler - the result handler
   */
  push.prototype.main =
    function(mainHandler) {
    // Use self to access core, project, result, logger etc from
    // PluginBase.
    // These are all instantiated at this point.
    var self = this,
      config = self.getCurrentConfig();

    self.logger.info('serialize the model in the requested manner');
    switch (config.typedVersion) {
      case 'json-tree:1.0.0':
        self.serializeTreeJson100(config, mainHandler,
          function(jsonStr) {
            self.deliver(config, mainHandler, jsonStr);
          });
        return;
      case 'json-flat:1.0.0':
        self.serializeFlatJson100(config, mainHandler,
          function(jsonStr) {
            self.deliver(config, mainHandler, jsonStr);
          });
        return;
      default:
        self.result.setSuccess(false);
        mainHandler("Unknown serialization type ", self.result);
        return;
    }

    self.result.setSuccess(false);
    mainHandler("could not push data model", self.result);
  };

  /**
  Pushing the current data-model into a JSON structure.
  */
  push.prototype.serializeFlatJson100 =
    function(config, mainHandler, deliveryFn) {
      var self = this,
        jsonStr;

      // produce a js-object
      FlatSerializer.export(self.core, self.activeNode,
        function(err, jsonObject) {
          if (err) {
            mainHandler(err, self.result);
            return;
          }
          jsonStr = JSON.stringify(jsonObject, null, 4);
          deliveryFn(jsonStr)
        });
    };
  /**
  Pushing the current data-model into a JSON structure.
  */
  push.prototype.serializeTreeJson100 =
    function(config, mainHandler, deliveryFn) {
      var self = this,
        jsonStr;

      // produce a js-object
      newserialization.export(self.core, self.activeNode,
        function(err, jsonObject) {
          if (err) {
            mainHandler(err, self.result);
            return;
          }
          jsonStr = JSON.stringify(jsonObject, null, 4);
          deliveryFn(jsonStr)
        });
    };

  push.prototype.deliver =
    function (config, mainHandler, payload) {
      var self = this,
        isProject = self.core.getPath(self.activeNode) === '',
        pushedFileName,
        artifact;

    switch (config.deliveryMode) {
      case 'file':
        if (!config.fileName) {
          mainHandler(new Error('No file provided.'), self.result);
          return;
        }
        pushedFileName = config.fileName;
        artifact = self.blobClient.createArtifact('pushed');
        self.logger.debug('Exported: ', pushedFileName);
        artifact.addFile(pushedFileName, payload,
          function(err) {
            if (err) {
              mainHandler(err, self.result);
              return;
            }
            artifact.save(
              function(err, hash) {
                if (err) {
                  mainHandler(err, self.result);
                  return;
                }
                self.result.addArtifact(hash);
                self.result.setSuccess(true);
                mainHandler(null, self.result);
              });
          });
        }
      }
  /* Then end of the module */
  return push;
});
