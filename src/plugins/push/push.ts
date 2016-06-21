/*globals define*/
/*jshint node:true, browser:true*/

/**
 Copyright Fred Eisele 2015
 https://www.stevefenton.co.uk/2013/01/complex-typescript-definitions-made-easy/
 http://immortals.isis.vanderbilt.edu:3000/docs/source/PluginConfig.html
 */

import PluginBase from 'plugin/PluginBase';
import PluginConfig from 'plugin/PluginConfig';
import * as q from 'q';
import NewSerializer from 'common/core/users/newserialization';
import FlatSerializer from 'serialize/FlatSerializer';
import CyjsSerializer from 'serialize/CyjsSerializer';
import BlobMetadata from 'blob/BlobMetadata';
import Util from 'blob/util';

interface DeliveryFunction {
  (json: string): void;
}

class Push extends PluginBase {
  constructor() {
     super();
  }

  getName(): string { return 'push'; }
  getVersion(): string { return '0.1.0'; }
  getDescription() {
    return 'Example of how to push a data-model from webgme.\n' +
      'The active node (i.e. open node on the canvas) will be the starting point, ' +
      'expect when importing a project.';
  };
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

  main(mainHandler: any) : void {
    let self = this;
    let config = self.getCurrentConfig();

    self.logger.info('serialize the model in the requested manner');
    let typedVersion = config['typedVersion'];
    switch (typedVersion) {
      case 'json-tree:1.0.0':
        self.serializeTreeJson100(config, mainHandler,
          function(jsonStr: string) {
            self.deliver(config, mainHandler, jsonStr);
          });
        return;
      case 'json-flat:1.0.0':
        self.serializeFlatJson100(config, mainHandler,
          function(jsonStr: string) {
            self.deliver(config, mainHandler, jsonStr);
          });
        return;
      case 'json-cytoscape:1.0.0':
        self.serializeCytoscapeJson100(config, mainHandler,
          function(jsonStr: string) {
            self.deliver(config, mainHandler, jsonStr);
          });
        return;
      default:
        self.result.setSuccess(false);
        mainHandler("Unknown serialization type ", self.result);
        return;
    }

    // self.result.setSuccess(false);
    // mainHandler("could not push data model", self.result);
  };


  serializeFlatJson100(
    config: PluginConfig,
    mainHandler: PluginJS.Callback, // does this have a specific signature?
    deliveryFn: DeliveryFunction
  ) {
      var jsonStr: string;
      // produce a js-object
      FlatSerializer.export(
        this.core,
        this.activeNode,
        function(err: Error, jsonObject: {nodes: any} ) {
          if (err) {
            mainHandler(err, this.result);
            return;
          }
          jsonStr = JSON.stringify(jsonObject.nodes, null, 4);
          deliveryFn(jsonStr)
        });
    };

  serializeCytoscapeJson100(
    config: PluginConfig,
    mainHandler: any,
    deliveryFn: DeliveryFunction) {
      var jsonStr:string;

      // produce a js-object
      CyjsSerializer.export(
        this.core,
        this.activeNode,
        function(err: Error, jsonObject) {
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
  serializeTreeJson100 (
    config: PluginConfig,
    mainHandler: any,
    deliveryFn: DeliveryFunction) {
      var jsonStr: string;

      // produce a js-object
      NewSerializer.export(
        this.core,
        this.activeNode,
        function(err: Error, jsonObject) {
          if (err) {
            mainHandler(err, this.result);
            return;
          }
          jsonStr = JSON.stringify(jsonObject, null, 4);
          deliveryFn(jsonStr)
        });
    };

  deliver(
    config: PluginConfig,
    mainHandler: PluginJS.Callback,
    payload) {
      var isProject = this.core.getPath(this.activeNode) === '';
      var pushedFileName: string;
      var artifact;

    switch (config['deliveryMode']) {
      case 'file':
        if (!config.fileName) {
          mainHandler(new Error('No file provided.'),
                      self.result);
          return;
        }
        pushedFileName = config['fileName'];
        artifact = this.blobClient.createArtifact('pushed');
        this.logger.debug('Exported: ', pushedFileName);
        artifact.addFile(pushedFileName, payload,
          function(err: Error) {
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
          break;
        }
      }
}
