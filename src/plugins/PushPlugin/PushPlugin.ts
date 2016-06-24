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
import * as webgmeV1 from 'webgme/v1';
import NewSerializer from '../../serialize/NewSerializer';
import FlatSerializer from 'serialize/FlatSerializer';
import CyjsSerializer from 'serialize/CyjsSerializer';
import BlobMetadata from 'blob/BlobMetadata';
import Util from 'blob/util';

interface DeliveryFunction {
  (json: string): void;
}

class PushPlugin extends PluginBase {
  constructor() {
     super();
  }

  main(mainHandler: PluginJS.Callback) : void {
    let config = this.getCurrentConfig();
    console.error("the main PushPlugin function is running");
    this.logger.info('serialize the model in the requested manner');
    let typedVersion = config['typedVersion'];
    switch (typedVersion) {
      case 'json-tree:1.0.0':
        this.serializeTreeJson100(config, mainHandler,
          function(jsonStr: string) {
            this.deliver(config, mainHandler, jsonStr);
          });
        return;
      case 'json-flat:1.0.0':
        this.serializeFlatJson100(config, mainHandler,
          function(jsonStr: string) {
            this.deliver(config, mainHandler, jsonStr);
          });
        return;
      case 'json-cytoscape:1.0.0':
        this.serializeCytoscapeJson100(config, mainHandler,
          function(jsonStr: string) {
            this.deliver(config, mainHandler, jsonStr);
          });
        return;
      default:
        this.result.setSuccess(false);
        mainHandler(new Error("Unknown serialization type "), this.result);
        return;
    }
  };


  serializeFlatJson100(
    config: PluginConfig,
    mainHandler: PluginJS.Callback,
    deliveryFn: DeliveryFunction
  ) {
      var jsonStr: string;
      // an asynchronous call
      FlatSerializer.export(
        this.core,
        this.activeNode,
        function(err: Error, jsonObject: webgmeV1.JsonObj ) {
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
      CyjsSerializer.export(
        this.core,
        this.activeNode,
        function(err: Error, jsonObject: webgmeV1.JsonObj) {
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
      NewSerializer.export(
        this.core,
        this.activeNode,
        function(err: Error, jsonObject: webgmeV1.JsonObj) {
          if (err) {
            mainHandler(err, this.result);
            return;
          }
          jsonStr = JSON.stringify(jsonObject, null, 4);
          deliveryFn(jsonStr)
        });
    };

  /**
   A function to deliver the serialized object properly.
  */
  deliver(
    config: PluginConfig,
    mainHandler: PluginJS.Callback,
    payload: string) {
      var isProject = this.core.getPath(this.activeNode) === '';
      var pushedFileName: string;
      var artifact: any;

    switch (config['deliveryMode']) {
      case 'file':
        if (!config.hasOwnProperty('fileName')) {
          mainHandler(new Error('No file name provided.'), this.result);
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
              function(err: Error, hash: PluginJS.Hash) {
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
