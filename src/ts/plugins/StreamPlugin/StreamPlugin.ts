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
import _ = require("underscore");
import PluginBase = require("plugin/PluginBase");

import MetaDataStr = require("text!plugins/StreamPlugin/metadata.json");


import { Producer, KeyedMessage, Client, ProduceRequest } from "kafka-node";

class StreamPlugin extends PluginBase {
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
    public main(mainHandler: GmeCommon.ResultCallback<GmeClasses.Result>): void {
        let config = this.getCurrentConfig();
        if (config === null) {
            this.sendNotification("The streaming plugin has failed: no configuration");
            mainHandler(null, this.result);
        }
        this.sendNotification(`The streaming plugin is running: ${new Date(Date.now()).toTimeString()}`);
        let configDictionary: any = config;
        // let core = this.core;
        let project = this.project;


        /**
         * Deliver the payload to the stream.
         */
        let producer: Producer | null = null;
        Promise
            .try(() => {
                let connStr = configDictionary["deliveryUrl"];
                return new Client(connStr, "kafka-node-client");
            })
            .then((client) => {
                producer = new Producer(client);

                producer.on("error", () => {
                    return Promise.reject(new Error("no payload produced"));
                });

                return Promise.promisify(producer.on, producer)("ready");
            })
            .then((producer: Producer) => {
                if (producer === null) {
                    return Promise.reject(new Error("no payload produced"));
                }
                let sender = Promise.promisify(producer.send, producer);
                return sender;
            })
            .then((sender: { (req: ProduceRequest[]): Promise<any> }) => {
                /**
                 * Get the most recent commit id.
                 */
                let lastKnownCommit = "";

                /**
                 * Push the commits into a KeyedMessage.
                 * These are only those more recent commits.
                 */
                let payload: any | null = null;
                let branch = configDictionary["branch"];
                const BATCH_SIZE = 20;
                let continueFlag = true;
                let startingPoint = branch;
                while (continueFlag) {
                    Promise
                        .try(() => {
                            return project.getHistory(startingPoint, BATCH_SIZE);
                        })
                        .then((history: GmeStorage.CommitObject[]) => {
                            if (history.length < BATCH_SIZE) {
                                continueFlag = false;
                            }
                            for (let commit of history) {
                                if (commit._id === lastKnownCommit) {
                                    continueFlag = false;
                                    break;
                                }
                                let km = new KeyedMessage("key", commit.message);
                                payload = [
                                    { topic: "topic2", messages: ["oi", "world", km], partition: 0 }
                                ];
                                sender(payload)
                                    .then((data) => {
                                        console.log(`sucessfully sent the data ${data}`);
                                    })
                                    .catch((err: Error) => {
                                        console.log(`failed sending the payload because ${err}`);
                                    });
                            }
                            let earliestCommit = history.pop();
                            if (earliestCommit === undefined) {
                                return;
                            }
                            startingPoint = earliestCommit._id;
                        });
                }
            });
    }
}

export = StreamPlugin;
