/*globals define*/
/*jshint node:true, browser:true*/

/**
 Copyright Fred Eisele 2015
 https://www.stevefenton.co.uk/2013/01/complex-typescript-definitions-made-easy/
 http://immortals.isis.vanderbilt.edu:3000/docs/source/PluginConfig.html
 */

import PluginConfig = require("plugin/pluginconfig");
import PluginBase = require("plugin/PluginBase");
import newserialization = require("common/core/users/newserialization");

import FlatSerializer = require('serialize/FlatSerializer');
import CyjsSerializer = require('serialize/CyjsSerializer');
import BlobMetadata = require('blob/BlobMetadata');
import Util = require('blob/util');
import Q = require("q");

"use strict;"

class Push extends PluginBase {

  constructor() {
    super();
  }

  /**
   * Gets the name of the push.
   * @returns {string} The name of the plugin.
   * @public
   */
  getName() : string {
    return 'push';
  };

  /**
   * Gets the semantic version (semver.org) of the push.
   * @returns {string} The version of the plugin.
   * @public
   */
  getVersion() : string {
    return '0.1.0';
  };

  /**
   * Gets the description of the push plugin.
   * @returns {string} The description of the plugin.
   * @public
   */
  getDescription() : string {
    return `Example of how to push a data-model from webgme.
The active node (i.e. open node on the canvas) will be the starting point,
expect when importing a project.`;
  };
  /**
   * Gets the configuration structure for the foo.
   * The ConfigurationStructure defines the configuration for the plugin
   * and will be used to populate the GUI when invoking the plugin from webGME.
   * @returns {object} The version of the plugin.
   * @public
   */
  getConfigStructure() {
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
      value: 'json-cytoscape:1.0.0',
      valueType: 'string',
      valueItems: [
        'json-flat:1.0.0',
        'json-cytoscape:1.0.0'
      ]
    }, {
      name: 'hostAddr',
      displayName: 'graph db host IP address or name',
      // regex: '^[a-zA-Z]+$',
      // regexMessage: 'Name can only contain English characters!',
      description: 'What is the ip address or name of the host for the ' +
        'graph database mega-model.',
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
  main (mainHandler:any) : void {
    // Use self to access core, project, result, logger etc from
    // PluginBase.
    // These are all instantiated at this point.
    let config = this.getCurrentConfig();

    this.logger.info('serialize the model in the requested manner');
    switch (config.typedVersion) {
      case 'json-tree:1.0.0':
        this.serializeTreeJson100(config, mainHandler,
          function(jsonStr) {
            this.deliver(config, mainHandler, jsonStr);
          });
        return;
      case 'json-flat:1.0.0':
        this.serializeFlatJson100(config, mainHandler,
          function(jsonStr) {
            this.deliver(config, mainHandler, jsonStr);
          });
        return;
      case 'json-cytoscape:1.0.0':
        this.serializeCytoscapeJson100(config, mainHandler,
          function(jsonStr) {
            this.deliver(config, mainHandler, jsonStr);
          });
        return;
      default:
        this.result.setSuccess(false);
        mainHandler("Unknown serialization type ", this.result);
        return;
    }

    this.result.setSuccess(false);
    mainHandler("could not push data model", this.result);
  };

  /**
  Pushing the current data-model into a JSON structure.
  */
  serializeFlatJson100 (config, mainHandler, deliveryFn):void {
      let jsonStr: string;

      // produce a js-object
      FlatSerializer.export(this.core, this.activeNode,
        function(err, jsonObject) {
          if (err) {
            mainHandler(err, this.result);
            return;
          }
          jsonStr = JSON.stringify(jsonObject.nodes, null, 4);
          deliveryFn(jsonStr)
        });
    };

  serializeCytoscapeJson100 (config, mainHandler, deliveryFn): void {
      let jsonStr: string;

      // produce a js-object
      CyjsSerializer.export(this.core, this.activeNode,
        function(err, jsonObject) {
          if (err) {
            mainHandler(err, this.result);
            return;
          }
          jsonStr = JSON.stringify(jsonObject, null, 4);
          deliveryFn(jsonStr)
        });
    };
  /**
  Pushing the current data-model into a JSON structure.
  */
  serializeTreeJson100 (config, mainHandler, deliveryFn): void {
      let jsonStr: string;

      // produce a js-object
      newserialization.export(this.core, this.activeNode,
        function(err, jsonObject) {
          if (err) {
            mainHandler(err, this.result);
            return;
          }
          jsonStr = JSON.stringify(jsonObject, null, 4);
          deliveryFn(jsonStr)
        });
    };

  deliver (config, mainHandler, payload): void {
      let isProject = this.core.getPath(this.activeNode) === '';
      let pushedFileName: string;
      let artifact;

    switch (config.deliveryMode) {
      case 'file':
        if (!config.fileName) {
          mainHandler(new Error('No file provided.'), this.result);
          return;
        }
        pushedFileName = config.fileName;
        artifact = this.blobClient.createArtifact('pushed');
        this.logger.debug('Exported: ', pushedFileName);
        artifact.addFile(pushedFileName, payload,
          function(err) {
            if (err) {
              mainHandler(err, this.result);
              return;
            }
            artifact.save(
              function(err, hash) {
                if (err) {
                  mainHandler(err, this.result);
                  return;
                }
                this.result.addArtifact(hash);
                this.result.setSuccess(true);
                mainHandler(null, this.result);
              });
          });
        }
      }
}
/* Then end of the module */
// let push = new Push();

export = Push;
