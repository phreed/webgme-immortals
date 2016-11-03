/*globals define*/
/*jshint node:true, browser:true*/

/**
 Copyright Fred Eisele 2016
 
 http://immortals.isis.vanderbilt.edu:3000/docs/source/PluginConfig.html

 The metadata.json needs to be copied as well.
 */
import Promise = require("bluebird");
import PluginBase = require("plugin/PluginBase");

import { FlatSerializer } from "serializer/FlatSerializer";
import { CyjsSerializer } from "serializer/CyjsSerializer";
import { NewSerializer } from "serializer/NewSerializer";

import MetaDataStr = require("text!plugins/PushPlugin/metadata.json");

class PushPlugin extends PluginBase {
    pluginMetadata: any;

    constructor() {
        super();
        this.pluginMetadata = JSON.parse(MetaDataStr);
    }

    public main(mainHandler: Core.ResultCallback): void {
        let config = this.getCurrentConfig();
        this.sendNotification(`The push plugin function is running: ${new Date(Date.now()).toTimeString()}`);
        let configDictionary: any = config;

        /**
        Push the current data-model into a JSON structure.
        */
        Promise
            .try(() => {
                switch (configDictionary["schematicVersion"]) {
                    case "tree:1.0.0":
                        let nsExport = Promise.promisify(NewSerializer.export);
                        return nsExport(this.core, this.activeNode);

                    case "flat:1.0.0":
                        let fsExport = Promise.promisify(FlatSerializer.exportLibrary);
                        return fsExport(this.core, this.activeNode);

                    case "cytoscape:1.0.0":
                        let cyExport = Promise.promisify(CyjsSerializer.exportMegaModel);
                        return cyExport(this.core, this.activeNode);

                    default:
                        return Promise.reject(new Error("no serializer matches typed version"));
                }
            })
            .then((jsonObject) => {
                let jsonStr = JSON.stringify(jsonObject, null, 4);
                if (jsonStr == null) {
                    return Promise.reject(new Error("no payload produced"));
                }
                return jsonStr;
            })
            .then((jsonStr: string) => {
                switch (configDictionary["deliveryMode"]) {
                    case "file":
                        return this.deliverFile(config, jsonStr);
                    case "rest:1.0.0":
                        return this.deliverUri(config, jsonStr);
                    default:
                        return Promise.reject(new Error("unknown delivery mode"));
                }
            })
            .then(() => {
                this.sendNotification("The push plugin has completed successfully.");
                mainHandler(null, this.result);
            })
            .catch((err: Error) => {
                this.sendNotification(`The push plugin has failed: ${err.message}`);
                mainHandler(err, this.result);
            });
    }

    /**
     A function to deliver the serialized object properly.
    */
    private deliverFile = (config: Config.GmeConfig, payload: string): Promise<Core.DataObject> => {
        let configDictionary: any = config;

        if (!config.hasOwnProperty("fileName")) {
            return Promise.reject(new Error("No file name provided."));
        }
        return Promise
            .try(() => {
                this.sendNotification("creating artifact");
                return this.blobClient.createArtifact("pushed");
            })
            .then((artifact) => {
                let pushedFileName = configDictionary["fileName"];
                this.sendNotification(`adding: ${pushedFileName}`);
                return Promise
                    .try(() => {
                        return artifact.addFile(pushedFileName, payload);
                    })
                    .then(() => {
                        this.sendNotification("saving artifact");
                        return artifact.save();
                    });
            })
            .then((hash: Core.MetadataHash) => {
                this.sendNotification("add artifact to result");
                this.result.addArtifact(hash);
                this.result.setSuccess(true);
                return Promise.resolve(this.result);
            });
    }

    private deliverUri = (config: Config.GmeConfig, payload: string): Promise<Core.DataObject> => {
        let configDictionary: any = config;
        this.sendNotification(`not implemented: ${configDictionary} : ${payload}`);

        if (!config.hasOwnProperty("deliveryUrl")) {
            return Promise.reject(new Error("No file name provided."));
        }
        return Promise.reject(new Error("restful delivery not available."));
    }
}
// the following returns the plugin class function
export = PushPlugin;
