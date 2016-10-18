/**
 * A plugin that inherits from the PluginBase.
 * To see source code documentation about available
 * properties and methods visit %host%/docs/source/PluginBase.html.
 * 
 * The idea here is to export all of the commits 
 * to a stream processor. From there the commits will
 * be extracted and used to construct different 
 * data-structures suitable for various questions and
 * the generation of derived and related facts.
 * In particular the incorporation of static and 
 * dynamic information about the system environment
 * and constructed components.
 */

import Promise = require("bluebird");
import PluginBase = require("plugin/PluginBase");

import MetaDataStr = require("text!plugins/StreamPlugin/metadata.json");

import * as nlv from "serializer/NodeListVisitor";
import { RdfNodeSerializer } from "serializer/RdfTtlSerializer";
import { PruningCondition, PruningFlag } from "serializer/filters";

import { getEdgesModel } from "extract/EdgesModelExtract";
import { getEdgesSchema } from "extract/EdgesSchemaExtract";
import { getTreeModel } from "extract/TreeModelExtract";
import { getTreeSchema } from "extract/TreeSchemaExtract";

import { deliverFile } from "delivery/FileDelivery";
import { deliverMultipart, deliverSinglepart } from "delivery/UriDelivery";

class StreamPlugin extends PluginBase {
    pluginMetadata: any;

    constructor() {
        super();
        this.pluginMetadata = JSON.parse(MetaDataStr);
    }

    public loadNodeMap(this: any, rootNode: PluginJS.Node): { [key: string]: any } {
        let core = this.core;
        return Promise
            .try(() => {
                let nodeArray = core.loadSubTree(rootNode);
                if (nodeArray instanceof Array) {
                    return nodeArray;
                } else {
                    return Promise.reject("not a valid array");
                }
            })
            .then((nodeArray: PluginJS.Node[]) => {
                let nodeMap = new Map<string, any>();
                for (let node in nodeArray) {
                    nodeMap.set(core.getPath(node), node);
                }
                return nodeMap;
            });

    }

    /**
    * Main function for the plugin to execute. This will perform the execution.
    * Notes:
    * - Always log with the provided logger.[error,warning,info,debug].
    * - Do NOT put any user interaction logic UI, etc. inside this method.
    * - callback always has to be called even if error happened.
    *
    * @param {PluginJS.Callback} mainHandler [description]
    */
    public main(mainHandler: PluginJS.ResultCallback): void {
        let config = this.getCurrentConfig();
        if (config === null) {
            this.sendNotification("The streaming plugin has failed: no configuration");
            mainHandler(null, this.result);
        }
        this.sendNotification(`This streaming plugin is running: ${new Date(Date.now()).toTimeString()}`);
        let configDictionary: any = config;

        Promise
            .try(() => {
                return this.loadNodeMap(this.rootNode);
            })
            .then((nodes: Map<string, any>) => {
                for (let key in nodes.keys()) {
                    this.logger.info("%s", key);
                }
                this.result.setSuccess(true);
                mainHandler(null, this.result);
            })
            .catch((err: Error) => {
                this.logger.error("%s", err.stack);
                mainHandler(err, this.result);
            });

        /**
        Push the current data-model into a JSON structure.
        */
        Promise
            .try(() => {
                switch (configDictionary["schematicVersion"]) {
                    case "schema-tree:1.0.0":
                        this.sendNotification("get schema tree");
                        return getTreeSchema(this, this.core, this.rootNode, this.META);

                    case "schema-flat:1.0.0":
                        this.sendNotification("get schema edges");
                        return getEdgesSchema(this, this.core, this.rootNode, this.META);

                    case "model-tree:1.0.0":
                        this.sendNotification("get model tree");
                        return getTreeModel(this, this.core, this.rootNode, this.META);

                    case "model-flat:1.0.0":
                        this.sendNotification("get model edges");
                        return getEdgesModel(this, this.core, this.rootNode, this.META);

                    default:
                        return Promise.reject(new Error("no serializer matches typed version"));
                }

            })
            .then((jsonObject) => {
                switch (configDictionary["syntacticVersion"]) {
                    case "json:1.0.0":
                        this.sendNotification("serializing json");

                        let jsonStr = JSON.stringify(jsonObject, null, 4);
                        if (jsonStr == null) {
                            return Promise.reject(new Error("no payload produced"));
                        }
                        return jsonStr;

                    case "ttl:1.0.0":
                        this.sendNotification("serializing ttl");

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
                        let accumulator = new RdfNodeSerializer(jsonObject, pruningCondition);
                        nlv.visit(jsonObject, accumulator.visitNode);
                        accumulator.complete();
                        return accumulator.ttlStr;

                    default:
                        return Promise.reject(new Error("no output writer matches typed version"));
                }
            })
            .then((payload) => {
                switch (configDictionary["deliveryMode"]) {
                    case "file:1.0.0":
                        this.sendNotification("deliver as file on server");
                        return deliverFile(this, config, payload);

                    case "multipart:1.0.0":
                        this.sendNotification("deliver as multipart/form-data");
                        return deliverMultipart(this, config, payload);

                    case "singlepart:1.0.0":
                        this.sendNotification("deliver as text/plain");
                        return deliverSinglepart(this, config, payload);

                    default:
                        return Promise.reject(new Error(`unknown delivery mode: ${configDictionary["deliveryMode"]}`));
                }
            })
            .then(() => {
                this.logger.info("successful completion");
                this.sendNotification("The streaming plugin has completed successfully.");
                mainHandler(null, this.result);
            })
            .catch((err: Error) => {
                this.logger.info(`failed: ${err.stack}`);
                console.log(`streaming plugin failed: ${err.stack}`);
                this.sendNotification(`The streaming plugin has failed: ${err.message}`);
                mainHandler(err, this.result);
            });
    }
}

export = StreamPlugin;
