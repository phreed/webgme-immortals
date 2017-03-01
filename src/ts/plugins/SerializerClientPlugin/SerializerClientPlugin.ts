/**
 * A plugin that inherits from the PluginBase.
 * To see source code documentation about available
 * properties and methods visit %host%/docs/source/PluginBase.html.
 */

import PluginBase = require("plugin/PluginBase");
// import edn = require("jsedn");

import MetaDataStr = require("text!plugins/SerializerClientPlugin/metadata.json");

import * as nlv from "serializer/NodeListVisitor";
import { RdfNodeSerializer } from "serializer/RdfTtlSerializer";
import { PruningCondition, PruningFlag } from "serializer/filters";

import { getEdgesModel } from "extract/EdgesModelExtract";
// import { getEdgesSchema } from "extract/EdgesSchemaExtract";
// import { getTreeModel } from "extract/TreeModelExtract";
// import { getTreeSchema } from "extract/TreeSchemaExtract";

import { deliverArtifact } from "delivery/ArtifactDelivery";

async function serialize(that: SerializerClientPlugin, configDictionary: any): Promise<GmeClasses.Result> {
    /**
    Push the current data-model into a JSON structure.
    */
    let nodeDict: Map<string, any>;

    switch (configDictionary["schematicVersion"]) {
        /*
        case "schema-tree:1.0.0":
            that.sendNotification("get schema tree");
            nodeDict = await getTreeSchema(this, this.core, this.rootNode, this.META);
        */
        /*
        case "schema-flat:1.0.0":
            this.sendNotification("get schema edges");
            return getEdgesSchema(this, this.core, this.rootNode, this.META);
        */
        /*
        case "model-tree:1.0.0":
            this.sendNotification("get model tree");
            return getTreeModel(this, this.core, this.rootNode, this.META);
        */
        case "model-flat:1.0.0":
            that.sendNotification("get model edges");
            nodeDict = await getEdgesModel(that, that.core, that.rootNode, that.META);
            break;
        default:
            return Promise.reject(new Error("no serializer matches typed version"));
    }
    let payload: string = "empty";
    switch (configDictionary["syntacticVersion"]) {
        case "json:1.0.0":
            that.sendNotification("serializing json");

            payload = await JSON.stringify([...nodeDict], null, 4);
            break;

        case "edn:1.0.0":
            that.sendNotification("serializing to EDN");
            payload = await JSON.stringify([...nodeDict], null, 4);
            // payload = await edn.encode(nodeDict);
            break;

        case "ttl:1.0.0":
            that.sendNotification("serializing ttl");

            let pruningCondition: PruningCondition = new PruningCondition();
            switch (configDictionary["filter"]) {
                case "library":
                    pruningCondition.flag = PruningFlag.Library;
                    pruningCondition.cond = true;
                    break;
                case "book":
                    pruningCondition.flag = PruningFlag.Library;
                    pruningCondition.cond = false;
                    break;
                case "all":
                default:
                    pruningCondition.flag = PruningFlag.None;
                    pruningCondition.cond = false;
            }

            let accumulator = new RdfNodeSerializer(nodeDict, pruningCondition);
            nlv.visitMap(nodeDict, accumulator.visitNode);
            await accumulator.complete();
            payload = accumulator.ttlStr;
            break;
        default:
            return Promise.reject(new Error("no output writer matches typed version"));
    }
    if (!payload) {
        return Promise.reject(new Error("no payload produced"));
    }
    that.sendNotification("deliver as file on server");
    return await deliverArtifact(that, configDictionary, payload);
}

class SerializerClientPlugin extends PluginBase {
    pluginMetadata: any;

    constructor() {
        super();
        this.pluginMetadata = JSON.parse(MetaDataStr);
    }

    /**
    * Main function for the plugin to execute. This will perform the execution.
    * Notes:
    * - Always log with the provided logger.[error,warning,info,debug].
    * - Do NOT put any user interaction logic UI, etc. inside this method.
    * - callback always has to be called even if error happened.
    *
    * @param {Core.Callback} mainHandler [description]
    */
    public async main(mainHandler: GmeCommon.ResultCallback<GmeClasses.Result>): Promise<void> {
        let configDict = this.getCurrentConfig();
        if (configDict === null) {
            this.sendNotification("The serializer plugin has failed: no configuration");
            mainHandler(null, this.result);
        }
        this.sendNotification(`This serializer plugin is running: ${new Date(Date.now()).toTimeString()}`);
        let configDictionary: any = configDict;
        try {
            await serialize(this, configDictionary);

            this.logger.info("successful completion");
            this.sendNotification("The serializer plugin has completed successfully.");
            mainHandler(null, this.result);
        }
        catch (err) {
            this.logger.info(`Serializer server plugin failed: ${err.stack}`);
            console.log(`serializer plugin failed: ${err.stack}`);
            this.sendNotification(`The serializer plugin has failed: ${err.message}`);
            mainHandler(err, this.result);
        };
    }
}

export = SerializerClientPlugin;
