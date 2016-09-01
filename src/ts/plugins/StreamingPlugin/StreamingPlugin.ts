
/**
 * A plugin that inherits from the PluginBase.
 * To see source code documentation about available
 * properties and methods visit %host%/docs/source/PluginBase.html.
 */

import Promise = require('bluebird');
import _ = require('underscore');
import http = require('https');

import PluginConfig = require('plugin/PluginConfig');
import PluginBase = require('plugin/PluginBase');
import MetaDataStr = require('text!./metadata.json');

import { attrToString, pathToString } from 'utility/gmeString';
import * as nlv from 'utility/NodeListVisitor';
import { RdfNodeSerializer } from 'utility/rdf';

// import async = require('asyncawait/async');
// import await = require('asyncawait/await');
// import fs = require('fs');
// import path = require('path');
// var fsPromise = Promise.promisifyAll(fs);


const REF_PREFIX = '#//';
const POINTER_SET_DIV = '-';
const CONTAINMENT_PREFIX = '';
const ROOT_NAME = 'ROOT';
const NS_URI = 'www.webgme.org';


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
            this.sendNotification('The streaming plugin has failed: no configuration');
            mainHandler(null, this.result);
        }
        this.sendNotification("This streaming plugin function is running: " + new Date(Date.now()).toTimeString());
        let configDictionary: any = config;

        /**
        Push the current data-model into a JSON structure.
        */
        Promise
            .try(() => {
                switch (configDictionary['schematicVersion']) {
                    case 'schema-tree:1.0.0':
                        this.sendNotification("get schema tree");
                        return this.getSchemaTree(this.core, this.rootNode, this.META);

                    case 'schema-flat:1.0.0':
                        this.sendNotification("get schema edges");
                        return this.getSchemaEdges(this.core, this.rootNode, this.META);

                    case 'model-tree:1.0.0':
                        this.sendNotification("get model tree");
                        return this.getModelTree(this.core, this.rootNode, this.META);

                    case 'model-flat:1.0.0':
                        this.sendNotification("get model edges");
                        return this.getModelEdges(this.core, this.rootNode, this.META);

                    default:
                        return Promise.reject(new Error("no serializer matches typed version"));
                }

            })
            .then((jsonObject) => {
                switch (configDictionary['syntacticVersion']) {
                    case 'json:1.0.0':
                        this.sendNotification("serializing json");

                        let jsonStr = JSON.stringify(jsonObject, null, 4);
                        if (jsonStr == null) {
                            return Promise.reject(new Error("no payload produced"));
                        }
                        return jsonStr;

                    case 'ttl:1.0.0':
                        this.sendNotification("serializing ttl");

                        let accumulator = new RdfNodeSerializer();
                        this.sendNotification("serializing ttl 1 ");
                        nlv.visit(jsonObject, accumulator.visitNode);
                        this.sendNotification("serializing ttl 2");
                        accumulator.complete();
                        return accumulator.ttlStr;

                    default:
                        return Promise.reject(new Error("no output writer matches typed version"));
                }
            })
            .then((payload) => {
                switch (configDictionary['deliveryMode']) {
                    case 'file:1.0.0':
                        this.sendNotification("deliver as file in artifact");
                        return this.deliverFile(config, payload);

                    case 'rest:1.0.0':
                        this.sendNotification("deliver as URI");

                        return this.deliverUri(config, payload);

                    default:
                        return Promise.reject(new Error('invalid delivery mode'));
                }
            })
            .then(() => {
                this.sendNotification("The streaming plugin has completed successfully.");
                mainHandler(null, this.result);
            })
            .catch((err: Error) => {
                this.sendNotification('The streaming plugin has failed: ' + err.message);
                mainHandler(err, this.result);
            });
    }

    getSchemaTree = (core: PluginJS.Core,
        rootNode: PluginJS.Node, metaNode: Node): Promise<string> => {
        let fcoName: string = attrToString(core.getAttribute(core.getFCO(this.rootNode), 'name'));
        let languageName: string = attrToString(core.getAttribute(this.rootNode, 'name'));
        this.logger.info('get schema tree with : ' + fcoName + ' : ' + languageName);
        return Promise
            .reject(new Error('get schema tree is not implemented'));
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
        rootNode: PluginJS.Node, metaNode: Node): PluginJS.Dictionary => {
        let config: PluginJS.GmeConfig = this.getCurrentConfig();
        let configDictionary: PluginJS.Dictionary = config;

        /**
        * Visitor function store.
        */
        let fcoName: string = attrToString(core.getAttribute(core.getFCO(this.rootNode), 'name'));
        let languageName: string = attrToString(core.getAttribute(this.rootNode, 'name'));
        this.logger.info('get model tree : ' + languageName + ' : ' + fcoName);
        let data: PluginJS.Dictionary = {
            'version': '0.0.1'
        };
        /**
         * A dictionary: look up nodes based on their path name.
         */
        let path2data: PluginJS.Dictionary = { '': data };

        /**
         * The base node makes reference to inheritance.
         * The parent node makes reference to containment.
         * The traverse function follows the containment tree.
         * @type {[type]}
         */
        let visitFn = (node: Node, done: PluginJS.VoidFn): void => {
            let core = this.core;
            // let nodeName = core.getAttribute(node, 'name');

            let metaName = (core.isLibraryRoot(node))
                ? ':LibraryRoot:'
                : core.getAttribute(core.getBaseType(node), 'name');
            let containRel = CONTAINMENT_PREFIX + metaName;
            let nodeData: PluginJS.Dictionary = { 'lang': languageName + ':' + containRel };
            let baseNode = core.getBase(node);
            let nodePath = core.getPath(node);
            path2data[nodePath] = nodeData;

            let parent = core.getParent(node);
            let parentPath = core.getPath(parent);
            let parentData = path2data[parentPath];
            parentData[containRel] = parentData[containRel] || [];
            parentData[containRel].push(nodeData);

            nodeData['id'] = core.getGuid(node);
            core.getAttributeNames(node).forEach((attrName: string) => {
                nodeData[attrName] = core.getAttribute(node, attrName);
            });

            Promise
                .try(() => {
                    // get pointers
                    return core.getPointerNames(node);
                })
                .map((ptrName: string) => {
                    let targetPathRaw = pathToString(core.getPointerPath(node, ptrName));
                    if (typeof targetPathRaw !== 'string') return;
                    let targetPath: string = targetPathRaw;
                    return Promise
                        .try(() => {
                            return core.loadByPath(this.rootNode, targetPath);
                        })
                        .then((targetNode: Node) => {
                            if (ptrName === 'base') {
                                nodeData[ptrName + POINTER_SET_DIV + fcoName]
                                    = core.getGuid(targetNode);
                            } else {
                                let targetMetaNode = core.getBaseType(targetNode);
                                let targetMetaName = core.getAttribute(targetMetaNode, 'name');
                                nodeData[ptrName + POINTER_SET_DIV + targetMetaName]
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
                                    let memberMetaName = core.getAttribute(memberMetaNode, 'name');
                                    let setAttr = setName + POINTER_SET_DIV + memberMetaName;

                                    nodeData[setAttr] = typeof nodeData[setAttr] === 'string'
                                        ? nodeData[setAttr] + ' ' + core.getGuid(memberNode)
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
                console.log("DATA: " + data);
                return data;
            });
    }


    getSchemaEdges = (core: PluginJS.Core,
        rootNode: PluginJS.Node, metaNode: Node): Promise<string> => {
        let fcoName: string = attrToString(core.getAttribute(core.getFCO(this.rootNode), 'name'));
        let languageName: string = attrToString(core.getAttribute(this.rootNode, 'name'));
        this.logger.info('get schema edges : ' + languageName + ' : ' + fcoName);
        return Promise
            .reject(new Error('get schema edges is not implemented'));
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
        rootNode: PluginJS.Node, metaNode: Node): PluginJS.Dictionary => {

        let config = this.getCurrentConfig();
        let configDictionary: any = config;

        let fcoName: string = attrToString(core.getAttribute(core.getFCO(this.rootNode), 'name'));
        let languageName: string = attrToString(core.getAttribute(this.rootNode, 'name'));
        this.logger.info('get model edges : ' + languageName + ' : ' + fcoName);

        let data: PluginJS.Dictionary = {
            'version': '0.0.1',
            'pointers': {}, 'sets': {}, 'base': null,

            'name': { 'name': fcoName },
            'type': { 'domain': languageName },
            'attributes': {},
            'children': {}
        };
        let nodeGuidMap: PluginJS.Dictionary = {};

        this.logger.info('A dictionary: look up nodes based on their path name.');
        let path2data: PluginJS.Dictionary = { '': data };

        /**
         * The base node makes reference to inheritance.
         * The parent node makes reference to containment.
         * The traverse function follows the containment tree.
         * @type {[type]}
         */
        let visitFn = (node: Node, done: PluginJS.VoidFn): void => {
            let core = this.core;
            let nodeNameAttr = core.getAttribute(node, 'name');
            if (typeof nodeNameAttr !== 'string') { done(); return; }

            let nodeName: string = nodeNameAttr;
            this.logger.info('visitor function with : ' + nodeName);

            let metaName: string;
            if (core.isLibraryRoot(node)) {
                metaName = ':LibraryRoot:';
            } else {
                let metaNameAttr = core.getAttribute(core.getBaseType(node), 'name');
                if (typeof metaNameAttr !== 'string') { done(); return; }
                metaName = metaNameAttr;
            }
            let baseNode: PluginJS.Node = core.getBase(node);
            let nodePath: string = core.getPath(node);
            let containRel = metaName;
            let nodeData: PluginJS.Dictionary =
                {
                    'name': {},
                    'type': { 'domain': languageName, 'parent': containRel },
                    'pointers': {}, 'sets': {}, 'base': null,
                    'attributes': {},
                    'children': {}
                };
            path2data[nodePath] = nodeData;

            // set the nodes guid
            let guid: string = core.getGuid(node);
            nodeData['guid'] = guid;

            // set the parent to know its child
            let parent: PluginJS.Node = core.getParent(node);
            let parentPath: string = core.getPath(parent);
            let parentData: PluginJS.Dictionary = path2data[parentPath];

            let children = parentData['children'];
            children[containRel] = children[containRel] || [];
            // children[containRel].push(nodeData);
            children[containRel].push(guid);
            parentData['children'] = children;


            // set the nodes attributes
            core.getAttributeNames(node).forEach((attrName: string) => {
                let attrValue = core.getAttribute(node, attrName);

                if (attrName.match('url*')) {
                    nodeData['name'][attrName] = attrValue;
                } else if (attrName === 'name') {
                    nodeData['name'][attrName] = attrValue;
                } else {
                    nodeData['attributes'][attrName] = attrValue;
                }
            });

            nodeGuidMap[guid] = nodeData;

            // get Pointers
            Promise
                .try(() => {
                    return core.getPointerNames(node);
                })
                .map((ptrName: string) => {
                    let targetPathRaw = pathToString(core.getPointerPath(node, ptrName));
                    if (typeof targetPathRaw !== 'string') return;
                    let targetPath: string = targetPathRaw;
                    Promise
                        .try(() => {
                            return core.loadByPath(this.rootNode, targetPath);
                        })
                        .then((targetNode: Node) => {
                            if (ptrName === 'base') {
                                nodeData['base'] = {
                                    name: fcoName,
                                    guid: core.getGuid(targetNode)
                                };
                            } else {
                                let pointers = nodeData['pointers'];
                                let targetMetaNode = core.getBaseType(targetNode);
                                let targetMetaName = core.getAttribute(targetMetaNode, 'name');
                                pointers[ptrName] = {
                                    name: targetMetaName,
                                    guid: core.getGuid(targetNode)
                                };
                            }
                        })
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
            .try<void>(() => {
                return core.traverse(this.rootNode, { excludeRoot: true }, visitFn);
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

        if (!configDictionary.hasOwnProperty('fileName')) {
            return Promise.reject(new Error('No file name provided.'));
        }
        this.sendNotification("config has property");

        return Promise
            .try(() => {
                return this.blobClient.createArtifact('stream');
            })
            .then((artifact) => {
                this.sendNotification('artifact created');
                let pushedFileName = configDictionary['fileName'];
                return Promise
                    .try(() => {
                        this.sendNotification('adding: ' + pushedFileName);
                        return artifact.addFile(pushedFileName, payload);
                    })
                    .then((hash: PluginJS.MetadataHash) => {
                        this.sendNotification('saving: ' + hash);
                        return artifact.save();
                    })
            })
            .then((hash: PluginJS.MetadataHash) => {
                this.sendNotification('adding artifact: ' + hash);
                this.result.addArtifact(hash);
                this.result.setSuccess(true);
                this.sendNotification('resolution');
                return Promise.resolve(this.result);
            })
            .catch((err: Error) => {
                this.sendNotification("problem in file delivery: " + err.message);
                return Promise.reject(err.message);
            })
    }

    private deliverUri = (config: PluginJS.GmeConfig, payload: string): Promise<PluginJS.DataObject> => {
        if (!config.hasOwnProperty('uri')) {
            return Promise.reject(new Error('No uri provided.'));
        }
        let configDictionary: any = config;
        return Promise
            .try(() => {
                return this.blobClient.createArtifact('pushed');
            })
            .then((artifact) => {
                let pushedFileName = configDictionary['uri'];
                this.logger.debug('Exporting: ', pushedFileName);
                return Promise
                    .try(() => {
                        return artifact.addFile(pushedFileName, payload);
                    })
                    .then((hash: PluginJS.MetadataHash) => {
                        return artifact.save();
                    })
                    .then((hash: PluginJS.MetadataHash) => {
                        this.result.addArtifact(hash);
                        this.result.setSuccess(true);
                        return Promise.resolve(this.result);
                    })
            });
    }

}

export = StreamingPlugin;
