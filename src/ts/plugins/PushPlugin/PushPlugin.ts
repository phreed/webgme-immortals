/*globals define*/
/*jshint node:true, browser:true*/

/**
 Copyright Fred Eisele 2016
 
 http://immortals.isis.vanderbilt.edu:3000/docs/source/PluginConfig.html

 The metadata.json needs to be copied as well.
 */
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

    public async main(mainHandler: GmeCommon.ResultCallback<GmeClasses.Result>): Promise<void> {
        let config = this.getCurrentConfig();
        this.sendNotification(`The push plugin function is running: ${new Date(Date.now()).toTimeString()}`);
        let configDictionary: any = config;

        /**
        Push the current data-model into a JSON structure.
        */
        try {
            let jsonObject;
            switch (configDictionary["schematicVersion"]) {
                case "tree:1.0.0":
                    jsonObject = await NewSerializer.export(this.core, this.activeNode);
                    break;
                case "flat:1.0.0":
                    jsonObject = await FlatSerializer.exportLibraryAsync(this.core, this.activeNode);
                    break;
                case "cytoscape:1.0.0":
                    jsonObject = await CyjsSerializer.exportMegaModelAsync(this.core, this.activeNode);
                    break;
                default:
                    return Promise.reject(new Error("no serializer matches typed version"));
            }

            let jsonStr = JSON.stringify(jsonObject, null, 4);
            if (jsonStr == null) {
                return Promise.reject(new Error("no payload produced"));
            }
            switch (configDictionary["deliveryMode"]) {
                case "file":
                    await this.deliverFile(config, jsonStr);
                    break;
                case "rest:1.0.0":
                    await this.deliverUri(config, jsonStr);
                    break;
                default:
                    return Promise.reject(new Error("unknown delivery mode"));
            }
            this.sendNotification("The push plugin has completed successfully.");
            mainHandler(null, this.result);
        }
        catch (err) {
            this.sendNotification(`The push plugin has failed: ${err.message}`);
            mainHandler(err, this.result);
        }
    }

    /**
     A function to deliver the serialized object properly.
    */
    private deliverFile = async (config: GmeConfig.GmeConfig, payload: string): Promise<GmeClasses.Result> => {
        let configDictionary: any = config;

        if (!config.hasOwnProperty("fileName")) {
            return Promise.reject(new Error("No file name provided."));
        }
        try {
            this.sendNotification("creating artifact");
            let artifact = this.blobClient.createArtifact("pushed");

            let pushedFileName = configDictionary["fileName"];
            this.sendNotification(`adding: ${pushedFileName}`);
            await artifact.addFile(pushedFileName, payload);

            this.sendNotification("saving artifact");
            let hash = await artifact.save();

            this.sendNotification("add artifact to result");
            this.result.addArtifact(hash);
            this.result.setSuccess(true);
            return Promise.resolve(this.result);
        } finally {}
    }

    private deliverUri = (config: GmeConfig.GmeConfig, payload: string): Promise<GmeClasses.Result> => {
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
