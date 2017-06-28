/**
 * A plugin that inherits from the PluginBase.
 * To see source code documentation about available
 * properties and methods visit %host%/docs/source/PluginBase.html.
 */

import PluginBase = require("plugin/PluginBase");
import trzt = require("transit-js");

import MetaDataStr = require("text!plugins/SerializerServerPlugin/metadata.json");

import * as nlv from "serializer/NodeListVisitor";
import { RdfNodeSerializer } from "serializer/RdfTtlSerializer";
import { PruningCondition, PruningFlag } from "serializer/filters";

import { get as getModel } from "extract/EdgesModelExtract";
import { get as getSchema } from "extract/EdgesSchemaExtract";

import { deliverFile } from "delivery/FileDelivery";
import { deliverMultipart, deliverSinglepart } from "delivery/UriDelivery";
import { deliverKafka } from "delivery/KafkaDelivery";

async function serialize(that: SerializerServerPlugin, configDictionary: any): Promise<GmeClasses.Result> {
    /**
    Push the current data-model into a JSON structure.
    */
    let nodeDict: Map<string, any>;

    switch (configDictionary["schematicVersion"]) {
        case "schema-flat:1.0.0":
            that.sendNotification("get model edges with schema");
            nodeDict = await getSchema(that, that.core, that.rootNode, that.META);
            break;
        case "model-flat:1.0.0":
            that.sendNotification("get model edges");
            nodeDict = await getModel(that, that.core, that.rootNode, that.META);
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

        case "trzt:1.0.0":
            that.sendNotification("serializing to Transit");
            try {
                that.logger.info(`preparing transit writer`);
                let w = trzt.writer("json-verbose");
                that.logger.info(`preparing to serialize to transit`);
                payload = w.write(nodeDict);
            } catch (err) {
                that.sendNotification(`problem writing transit file: ${err.message}`);
                return Promise.reject(err.message);
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

            let accumulator = new RdfNodeSerializer(that, nodeDict, pruningCondition);
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

        case "kafka:1.0.0":
            that.sendNotification("deliver to kafka");
            return await deliverKafka(that, configDictionary, payload);

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
            this.sendNotification(`The serializer plugin has failed: ${err.message}`);
            mainHandler(err, this.result);
        }
    }
}

export = SerializerServerPlugin;
