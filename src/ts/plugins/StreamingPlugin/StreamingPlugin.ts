
/**
 * A plugin that inherits from the PluginBase.
 * To see source code documentation about available
 * properties and methods visit %host%/docs/source/PluginBase.html.
 */

import Promise = require("bluebird");
import PluginBase = require("plugin/PluginBase");
import MetaDataStr = require("text!./metadata.json");

import { attrToString, pathToString } from "utility/gmeString";
import * as nlv from "serializer/NodeListVisitor";
import { RdfNodeSerializer } from "serializer/rdf";
import { PruningCondition, PruningFlag } from "serializer/filters";

// import async = require("asyncawait/async");
// import await = require("asyncawait/await");
// import fs = require("fs");
// import path = require("path");
// var fsPromise = Promise.promisifyAll(fs);


// const REF_PREFIX = "#//";
const POINTER_SET_DIV = "-";
const CONTAINMENT_PREFIX = "";
// const ROOT_NAME = "ROOT";
// const NS_URI = "www.webgme.org";


class StreamingPlugin extends PluginBase {
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
    * @param {PluginJS.Callback} mainHandler [description]
    */
    public main(mainHandler: PluginJS.ResultCallback): void {
        let config = this.getCurrentConfig();
        if (config === null) {
            this.sendNotification("The streaming plugin has failed: no configuration");
            mainHandler(null, this.result);
        }
        this.sendNotification("This streaming plugin is running: " + new Date(Date.now()).toTimeString());
        let configDictionary: any = config;

        /**
        Push the current data-model into a JSON structure.
        */
        Promise
            .try(() => {
                switch (configDictionary["schematicVersion"]) {
                    case "schema-tree:1.0.0":
                        this.sendNotification("get schema tree");
                        return this.getSchemaTree(this.core, this.rootNode, this.META);

                    case "schema-flat:1.0.0":
                        this.sendNotification("get schema edges");
                        return this.getSchemaEdges(this.core, this.rootNode, this.META);

                    case "model-tree:1.0.0":
                        this.sendNotification("get model tree");
                        return this.getModelTree(this.core, this.rootNode, this.META);

                    case "model-flat:1.0.0":
                        this.sendNotification("get model edges");
                        return this.getModelEdges(this.core, this.rootNode, this.META);

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
                            case "off-book":
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
                        this.sendNotification("deliver as file in artifact");
                        return this.deliverFile(config, payload);

                    case "rest:1.0.0":
                        this.sendNotification("deliver as URI");
                        return this.deliverUri(config, payload);

                    default:
                        return Promise.reject(new Error("invalid delivery mode"));
                }
            })
            .then(() => {
                this.sendNotification("The streaming plugin has completed successfully.");
                mainHandler(null, this.result);
            })
            .catch((err: Error) => {
                console.log("streaming plugin failed: " + err.stack);
                this.sendNotification("The streaming plugin has failed: " + err.message);
                mainHandler(err, this.result);
            });
    }

    getSchemaTree = (core: PluginJS.Core,
        _1: PluginJS.Node, _2: Node): Promise<string> => {
        let fcoName: string = attrToString(core.getAttribute(core.getFCO(this.rootNode), "name"));
        let languageName: string = attrToString(core.getAttribute(this.rootNode, "name"));
        this.logger.info("get schema tree with : " + fcoName + " : " + languageName);
        return Promise
            .reject(new Error("get schema tree is not implemented"));
    }

    /**
     * Get the schema from the nodes having meta rules.
     * https://github.com/webgme/webgme/wiki/GME-Core-API#the-traverse-method
     * This function makes extensive use of a dictionary to build up a tree.
     *
     * @param {PluginJS.Core}     core        [description]
     * @param {Node}              rootNode    [description]
     * @param {PluginJS.Callback} mainHandler [description]
     */
    getModelTree = (core: PluginJS.Core,
        _rootNode: PluginJS.Node, _metaNode: Node): PluginJS.Dictionary => {
        // let config: PluginJS.GmeConfig = this.getCurrentConfig();
        // let configDictionary: PluginJS.Dictionary = config;

        /**
        * Visitor function store.
        */
        let fcoName: string = attrToString(core.getAttribute(core.getFCO(this.rootNode), "name"));
        let languageName: string = attrToString(core.getAttribute(this.rootNode, "name"));
        this.logger.info("get model tree : " + languageName + " : " + fcoName);
        let rootEntry: PluginJS.Dictionary = {
            "version": "0.0.1"
        };
        /**
         * A dictionary: look up nodes based on their path name.
         */
        let path2entry: PluginJS.Dictionary = { "": rootEntry };

        /**
         * The base node makes reference to inheritance.
         * The parent node makes reference to containment.
         * The traverse function follows the containment tree.
         * @type {[type]}
         */
        let visitFn = (node: Node, done: PluginJS.VoidFn): void => {
            let core = this.core;
            // let nodeName = core.getAttribute(node, "name");

            let metaName = (core.isLibraryRoot(node))
                ? ":LibraryRoot:"
                : core.getAttribute(core.getBaseType(node), "name");
            let containRel = CONTAINMENT_PREFIX + metaName;
            let sourceEntry: PluginJS.Dictionary = { "lang": languageName + ":" + containRel };
            // let baseNode = core.getBase(node);
            let nodePath = core.getPath(node);
            path2entry[nodePath] = sourceEntry;

            let parent = core.getParent(node);
            let parentPath = core.getPath(parent);
            let parentData = path2entry[parentPath];
            parentData[containRel] = parentData[containRel] || [];
            parentData[containRel].push(sourceEntry);

            sourceEntry["id"] = core.getGuid(node);
            core.getAttributeNames(node).forEach((attrName: string) => {
                sourceEntry[attrName] = core.getAttribute(node, attrName);
            });

            Promise
                .try(() => {
                    // get pointers
                    return core.getPointerNames(node);
                })
                .map((ptrName: string) => {
                    let targetPathRaw = pathToString(core.getPointerPath(node, ptrName));
                    if (typeof targetPathRaw !== "string") { return; }
                    let targetPath: string = targetPathRaw;
                    return Promise
                        .try(() => {
                            return core.loadByPath(this.rootNode, targetPath);
                        })
                        .then((targetNode: Node) => {
                            if (ptrName === "base") {
                                sourceEntry[ptrName + POINTER_SET_DIV + fcoName]
                                    = core.getGuid(targetNode);
                            } else {
                                let targetMetaNode = core.getBaseType(targetNode);
                                let targetMetaName = core.getAttribute(targetMetaNode, "name");
                                sourceEntry[ptrName + POINTER_SET_DIV + targetMetaName]
                                    = core.getGuid(targetNode);
                            }
                        });
                });

            Promise
                .try(() => {
                    // get sets
                    return core.getSetNames(node);
                })
                .map((setName: string) => {
                    return Promise
                        .try(() => {
                            return core.getMemberPaths(node, setName);
                        })
                        .map((memberPath: string) => {
                            return Promise
                                .try(() => {
                                    return core.loadByPath(this.rootNode, memberPath);
                                })
                                .then((memberNode: Node) => {
                                    let memberMetaNode = core.getBaseType(memberNode);
                                    let memberMetaName = core.getAttribute(memberMetaNode, "name");
                                    let setAttr = setName + POINTER_SET_DIV + memberMetaName;

                                    sourceEntry[setAttr] = typeof sourceEntry[setAttr] === "string"
                                        ? sourceEntry[setAttr] + " " + core.getGuid(memberNode)
                                        : core.getGuid(memberNode);
                                });
                        });
                });
            done();
        };

        /**
        * Visit the node and perform the function.
        * Documentation for traverse.
        * https://github.com/webgme/webgme/wiki/GME-Core-API#the-traverse-method
        * Related example using traverse.
        * https://github.com/webgme/xmi-tools/blob/master/src/plugins/XMIExporter/XMIExporter.js#L430
        */
        return Promise
            .try(() => {
                return core.traverse(this.rootNode, { excludeRoot: true }, visitFn);
            })
            .then(() => {
                console.log("DATA: " + rootEntry);
                return rootEntry;
            });
    }


    getSchemaEdges = (core: PluginJS.Core,
        _rootNode: PluginJS.Node, _metaNode: Node): Promise<string> => {
        let fcoName: string = attrToString(core.getAttribute(core.getFCO(this.rootNode), "name"));
        let languageName: string = attrToString(core.getAttribute(this.rootNode, "name"));
        this.logger.info("get schema edges : " + languageName + " : " + fcoName);
        return Promise
            .reject(new Error("get schema edges is not implemented"));
    }
    /**
     * Get the schema from the nodes having meta rules.
     * https://github.com/webgme/webgme/wiki/GME-Core-API#the-traverse-method
     * This function makes extensive use of a dictionary to build tuples.
     *
     * @param {PluginJS.Core}     core        [description]
     * @param {Node}              rootNode    [description]
     * @param {PluginJS.Callback} mainHandler [description]
     */
    getModelEdges = (core: PluginJS.Core,
        _rootNode: PluginJS.Node, _metaNode: Node): PluginJS.Dictionary => {

        // let config = this.getCurrentConfig();
        // let configDictionary: any = config;

        let fcoName: string = attrToString(core.getAttribute(core.getFCO(this.rootNode), "name"));
        let languageName: string = attrToString(core.getAttribute(this.rootNode, "name"));
        this.logger.info("get model edges : " + languageName + " : " + fcoName);

        let rootEntry: PluginJS.Dictionary
            = {
                "version": "0.0.1",
                "pointers": {}, "reverses": {},
                "sets": {},
                "base": {
                    "name": "Object",
                    "guid": "00000000-0000-0000-0000-000000000000"
                },
                "name": { "name": fcoName },
                "type": { "domain": languageName },
                "attributes": {},
                "children": {},
                "prune": PruningFlag.None,
                "guid": "00000000-0000-0000-0000-000000000000"
            };
        let nodeGuidMap: PluginJS.Dictionary = {
            "00000000-0000-0000-0000-000000000000": rootEntry
        };

        this.logger.info("A dictionary: look up nodes based on their path name.");
        let path2entry: PluginJS.Dictionary = { "": rootEntry };

        /**
         * A filter mechanism to effectively eliminate containment branches.
         * Any path included in the prune-list will be the root of a 
         * pruned subtree.
         */
        let pruneList: string[] = [];

        /**
         * The base node makes reference to inheritance.
         * The parent node makes reference to containment.
         * The traverse function follows the containment tree.
         * @type {[type]}
         */
        let visitFn = (node: Node, done: PluginJS.VoidFn): void => {
            try {
                let core = this.core;
                let nodePath: string = core.getPath(node);

                let prunedRootPath: string | null = null;
                for (let pl of pruneList) {
                    if (nodePath.indexOf(pl) !== 0) { continue; }
                    // console.log("pruned: " + nodePath + "::" + pl);
                    prunedRootPath = pl;
                }

                let nodeNameAttr = core.getAttribute(node, "name");
                if (typeof nodeNameAttr !== "string") { return; }

                let nodeName: string = nodeNameAttr;
                this.logger.info("visitor function with : " + nodeName);

                let baseNodeGuid: string = core.getGuid(core.getBase(node));
                let baseNodeTypeGuid: string = core.getGuid(core.getBaseType(node));
                let baseNodeRootGuid: string = core.getGuid(core.getBaseRoot(node));

                // set the nodes sourceGuid
                let sourceGuid: string = core.getGuid(node);
                let sourceEntry: PluginJS.Dictionary
                    = Object.assign({
                        "guid": sourceGuid,
                        "name": {},
                        "type": {
                            "domain": languageName,
                            "meta": baseNodeTypeGuid,
                            "root": baseNodeRootGuid,
                            "base": baseNodeGuid
                        },
                        "pointers": {}, "reverses": {},
                        "sets": {},
                        "base": {
                            "name": "FCO",
                            "guid": "00000000-0000-0000-0000-000000000000"
                        },
                        "attributes": {},
                        "children": {},
                        "prune": PruningFlag.None
                    }, nodeGuidMap[sourceGuid]);

                nodeGuidMap[sourceGuid] = sourceEntry;

                let metaName: string;
                if (node === this.rootNode) {
                    metaName = ":Root:";
                    sourceEntry["type"] = {
                        "ns": "cp",
                        "name": "GmeInterchangeFormat"
                    };
                } else if (core.isLibraryRoot(node)) {
                    metaName = ":LibraryRoot:";

                    // console.log("prune: " + nodePath);
                    pruneList.push(nodePath);
                    prunedRootPath = nodePath;
                } else {
                    let metaNameAttr = core.getAttribute(core.getBaseType(node), "name");
                    if (typeof metaNameAttr !== "string") { return; }
                    metaName = metaNameAttr;
                }
                let containRel = metaName;
                sourceEntry["type"]["parent"] = containRel;
                sourceEntry["prune"] = (prunedRootPath === null) ? PruningFlag.None : PruningFlag.Library;
                path2entry[nodePath] = sourceEntry;

                // set the parent to know its child the root node has no parent
                // if a non-pruned item has a pruned parent then bring it in.
                if (node !== this.rootNode) {
                    let parent: PluginJS.Node = core.getParent(node);
                    let parentPath: string = core.getPath(parent);

                    let parentData: PluginJS.Dictionary = path2entry[parentPath];
                    let children = parentData["children"];
                    children[containRel] = children[containRel] || [];
                    // children[containRel].push(sourceEntry);
                    children[containRel].push(sourceGuid);
                }

                // set the nodes attributes
                core.getAttributeNames(node).forEach((attrName: string) => {
                    let attrValue = core.getAttribute(node, attrName);

                    if (attrName.match("url*")) {
                        sourceEntry["name"][attrName] = attrValue;
                    } else if (attrName === "name") {
                        sourceEntry["name"][attrName] = attrValue;
                    } else {
                        sourceEntry["attributes"][attrName] = attrValue;
                    }
                });

                // get pointers & referred (reverse-pointer)
                Promise
                    .try(() => {
                        return core.getPointerNames(node);
                    })
                    .map((ptrName: string) => {
                        let targetPathRaw = pathToString(core.getPointerPath(node, ptrName));
                        if (typeof targetPathRaw !== "string") { return; }
                        let targetPath: string = targetPathRaw;
                        Promise
                            .try(() => {
                                return core.loadByPath(this.rootNode, targetPath);
                            })
                            .then((targetNode: Node) => {
                                let targetGuid = core.getGuid(targetNode);
                                if (ptrName === "base") {
                                    sourceEntry["base"] = {
                                        name: fcoName,
                                        guid: targetGuid
                                    };
                                } else {
                                    let pointers = sourceEntry["pointers"];
                                    let targetMetaNode = core.getBaseType(targetNode);
                                    let targetMetaName = core.getAttribute(targetMetaNode, "name");
                                    pointers[ptrName] = {
                                        name: targetMetaName,
                                        guid: targetGuid
                                    };
                                    let targetEntry = nodeGuidMap[targetGuid];
                                    if (targetEntry === undefined) {
                                        targetEntry = {
                                            "name": {},
                                            "guid": targetGuid,
                                            "pointers": {}, "reverses": {}
                                        };
                                        nodeGuidMap[targetGuid] = targetEntry;
                                    }
                                    targetEntry["reverses"][ptrName] = {
                                        name: targetMetaName,
                                        guid: sourceGuid
                                    };
                                }
                            });
                    });
            } finally {
                done();
            }
        };

        /**
        * Visit the node and perform the function.
        * Documentation for traverse.
        * https://github.com/webgme/webgme/wiki/GME-Core-API#the-traverse-method
        * Related example using traverse.
        * https://github.com/webgme/xmi-tools/blob/master/src/plugins/XMIExporter/XMIExporter.js#L430
        */
        return Promise
            .try<void>(() => {
                return core.traverse(this.rootNode,
                    { excludeRoot: false },
                    visitFn);
            })
            .then(() => {
                return nodeGuidMap;
            });
    }


    /**
     A function to deliver the serialized object properly.

    * @param {}
    */
    private deliverFile = (config: PluginJS.GmeConfig, payload: string): Promise<PluginJS.DataObject> => {

        let configDictionary: any = config;

        if (!configDictionary.hasOwnProperty("fileName")) {
            return Promise.reject(new Error("No file name provided."));
        }
        this.sendNotification("config has property");

        return Promise
            .try(() => {
                let artifactName = "stream-";
                switch (configDictionary["schematicVersion"]) {
                    case "schema-tree:1.0.0":
                        artifactName += "schema-tree";
                        break;
                    case "schema-flat:1.0.0":
                        artifactName += "schema-flat";
                        break;
                    case "model-tree:1.0.0":
                        artifactName += "model-tree";
                        break;
                    case "model-flat:1.0.0":
                        artifactName += "model-flat";
                        break;
                }
                return this.blobClient.createArtifact(artifactName);
            })
            .then((artifact) => {
                this.sendNotification("artifact created");
                let pushedFileName = configDictionary["fileName"];
                switch (configDictionary["syntacticVersion"]) {
                    case "json:1.0.0":
                        pushedFileName += ".json";
                        break;
                    case "ttl:1.0.0":
                        pushedFileName += ".ttl";
                        break;
                    default:
                        pushedFileName += ".txt";
                }
                return Promise
                    .try(() => {
                        this.sendNotification("adding: " + pushedFileName);
                        return artifact.addFile(pushedFileName, payload);
                    })
                    .then((hash: PluginJS.MetadataHash) => {
                        this.sendNotification("saving: " + hash);
                        return artifact.save();
                    });
            })
            .then((hash: PluginJS.MetadataHash) => {
                this.sendNotification("adding artifact: " + hash);
                this.result.addArtifact(hash);
                this.result.setSuccess(true);
                this.sendNotification("resolution");
                return Promise.resolve(this.result);
            })
            .catch((err: Error) => {
                this.sendNotification("problem in file delivery: " + err.message);
                return Promise.reject(err.message);
            });
    }

    private deliverUri = (config: PluginJS.GmeConfig, payload: string): Promise<PluginJS.DataObject> => {
        if (!config.hasOwnProperty("uri")) {
            return Promise.reject(new Error("No uri provided."));
        }
        let configDictionary: any = config;
        return Promise
            .try(() => {
                return this.blobClient.createArtifact("pushed");
            })
            .then((artifact) => {
                let pushedFileName = configDictionary["uri"];
                this.logger.debug("Exporting: ", pushedFileName);
                return Promise
                    .try(() => {
                        return artifact.addFile(pushedFileName, payload);
                    })
                    .then(() => {
                        return artifact.save();
                    })
                    .then((hash: PluginJS.MetadataHash) => {
                        this.result.addArtifact(hash);
                        this.result.setSuccess(true);
                        return Promise.resolve(this.result);
                    });
            });
    }
}

export = StreamingPlugin;
