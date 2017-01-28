/**
 * A plugin that inherits from the PluginBase.
 * To see source code documentation about available
 * properties and methods visit %host%/docs/source/PluginBase.html.
 */

import PluginBase = require("plugin/PluginBase");

import MetaDataStr = require("text!plugins/SerializerServerPlugin/metadata.json");

import * as nlv from "serializer/NodeListVisitor";
import { RdfNodeSerializer } from "serializer/RdfTtlSerializer";
import { PruningCondition, PruningFlag } from "serializer/filters";

import { getEdgesModel } from "extract/EdgesModelExtract";
// import { getEdgesSchema } from "extract/EdgesSchemaExtract";
// import { getTreeModel } from "extract/TreeModelExtract";
// import { getTreeSchema } from "extract/TreeSchemaExtract";

import { deliverFile } from "delivery/FileDelivery";
import { deliverMultipart, deliverSinglepart } from "delivery/UriDelivery";

async function serialize(that: SerializerServerPlugin, configDictionary: any): Promise<GmeClasses.Result> {
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
    let payload: string = "";
    switch (configDictionary["syntacticVersion"]) {
        case "json:1.0.0":
            that.sendNotification("serializing json");

            let jsonStr = await JSON.stringify(nodeDict, null, 4);
            if (jsonStr == null) {
                return Promise.reject(new Error("no payload produced"));
            }
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

    switch (configDictionary["deliveryMode"]) {
        case "file:1.0.0":
            that.sendNotification("deliver as file on server");
            return await deliverFile(that, configDictionary, payload);

        case "multipart:1.0.0":
            that.sendNotification("deliver as multipart/form-data");
            return await deliverMultipart(that, configDictionary, payload);

        case "singlepart:1.0.0":
            that.sendNotification("deliver as text/plain");
            return await deliverSinglepart(that, configDictionary, payload);

        default:
            return Promise.reject(new Error(`unknown delivery mode: ${configDictionary["deliveryMode"]}`));
    }
}

class SerializerServerPlugin extends PluginBase {
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
            this.sendNotification("The streaming plugin has failed: no configuration");
            mainHandler(null, this.result);
        }
        this.sendNotification(`This streaming plugin is running: ${new Date(Date.now()).toTimeString()}`);
        let configDictionary: any = configDict;
        try {
            await serialize(this, configDictionary);

            this.logger.info("successful completion");
            this.sendNotification("The streaming plugin has completed successfully.");
            mainHandler(null, this.result);
        }
        catch (err) {
            this.logger.info(`failed: ${err.stack}`);
            console.log(`streaming plugin failed: ${err.stack}`);
            this.sendNotification(`The streaming plugin has failed: ${err.message}`);
            mainHandler(err, this.result);
        };
    }
}

export = SerializerServerPlugin;
