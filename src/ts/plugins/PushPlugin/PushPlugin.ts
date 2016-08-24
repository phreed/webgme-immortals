/*globals define*/
/*jshint node:true, browser:true*/

/**
 Copyright Fred Eisele 2015
 https://www.stevefenton.co.uk/2013/01/complex-typescript-definitions-made-easy/
 http://immortals.isis.vanderbilt.edu:3000/docs/source/PluginConfig.html

 The metadata.json needs to be copied as well.
 */
import Promise = require('bluebird');
import PluginBase = require('plugin/PluginBase');
import PluginConfig = require('plugin/PluginConfig');
import Util = require('blob/util');

import FlatSerializer from 'serialize/FlatSerializer';
import CyjsSerializer from 'serialize/CyjsSerializer';
import NewSerializer from 'serializer/NewSerializer';
import * as webgmeV1 from 'webgme/v1';
import BlobMetadata from 'blob/BlobMetadata';
import MetaDataStr = require('text!./metadata.json');

interface DeliveryFunction {
    (json: string): void;
}

class PushPlugin extends PluginBase {
    pluginMetadata: any;

    constructor() {
        super();
        this.pluginMetadata = JSON.parse(MetaDataStr);
    }

    public main(mainHandler: PluginJS.ResultCallback): void {
        let config = this.getCurrentConfig();
        console.error("the main PushPlugin function is running");
        this.logger.info('serialize the model in the requested manner');
        let configDictionary: any = config;

        /**
        Push the current data-model into a JSON structure.
        */
        Promise
            .try(() => {
                switch (configDictionary['typedVersion']) {
                    case 'json-tree:1.0.0':
                        let nsExport = Promise.promisify(NewSerializer.export);
                        return nsExport(this.core, this.activeNode);

                    case 'json-flat:1.0.0':
                        let fsExport = Promise.promisify(FlatSerializer.export);
                        return fsExport(this.core, this.activeNode);

                    case 'json-cytoscape:1.0.0':
                        let cyExport = Promise.promisify(CyjsSerializer.export);
                        return cyExport(this.core, this.activeNode);

                    default:
                        return Promise.reject(new Error("no serializer matches typed version"));
                }
            })
            .then((jsonObject) => {
                return JSON.stringify(jsonObject, null, 4);
            })
            .then((jsonStr: string) => {
                return this.deliver(config, jsonStr);
            })
            .then(() => {
                mainHandler(null, this.result);
            })
            .catch((err) => {
                mainHandler(err, this.result);
            });
    }

    /**
     A function to deliver the serialized object properly.
    */
    private deliver = (config: PluginJS.GmeConfig, payload: string): Promise<Object> => {
        var isProject = this.core.getPath(this.activeNode) === '';
        var pushedFileName: string;
        var artifact: any;
        let configDictionary: any = config;

        switch (configDictionary['deliveryMode']) {
            case 'file':
                if (!config.hasOwnProperty('fileName')) {
                    return Promise.reject(new Error('No file name provided.'));
                }
                return Promise
                    .try(() => {
                        return this.blobClient.createArtifact('pushed');
                    })
                    .then((artifact) => {
                        let pushedFileName = configDictionary['fileName'];
                        this.logger.debug('Exporting: ', pushedFileName);
                        return [artifact, artifact.addFile(pushedFileName, payload)];
                    })
                    .spread((artifact: PluginJS.Artifact, hash: PluginJS.MetadataHash) => {
                        return artifact.save();
                    })
                    .then((hash: PluginJS.MetadataHash) => {
                        this.result.addArtifact(hash);
                        this.result.setSuccess(true);
                        return Promise.resolve(this.result);
                    });
            default:
                return Promise.reject(new Error('unknown delivery mode'));
        }
    }
}
// the following returns the plugin class function
export = PushPlugin;
