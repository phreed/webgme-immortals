
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
import { RdfSerializer } from 'utility/rdf';

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
        this.sendNotification("This streaming plugin function is running: " + new Date(Date.now()).toTimeString());
        let configDictionary: any = config;

        /**
        Push the current data-model into a JSON structure.
        */
        Promise
            .try(() => {
                switch (configDictionary['schematicVersion']) {
                    case 'json-schema-tree:1.0.0':
                        return this.getSchemaTree(this.core, this.rootNode, this.META);

                    case 'json-schema-flat:1.0.0':
                        return this.getSchemaEdges(this.core, this.rootNode, this.META);

                    case 'json-model-tree:1.0.0':
                        return this.getModelTree(this.core, this.rootNode, this.META);

                    case 'json-model-flat:1.0.0':
                        return this.getModelEdges(this.core, this.rootNode, this.META);

                    default:
                        return Promise.reject(new Error("no serializer matches typed version"));
                }

            })
            .then((jsonObject) => {
                switch (configDictionary['syntacticVersion']) {
                    case 'json-tree:1.0.0':
                        return JSON.stringify(jsonObject, null, 4);

                    case 'json-ttl:1.0.0': jsonObject
                        return writeRdfTtlString(jsonObject);

                    default:
                        return Promise.reject(new Error("no output writer matches typed version"));
                }
            })
            .then((jsonStr: string) => {
                return this.deliverFile(config, jsonStr);
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

    /**
     A function to deliver the serialized object properly.

    * @param {}
    */
    private deliverFile = (config: PluginJS.GmeConfig, payload: string): Promise<PluginJS.DataObject> => {
        var isProject = this.core.getPath(this.activeNode) === '';
        var pushedFileName: string;
        var artifact: any;
        let configDictionary: any = config;

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
    }

    private deliverUri = (config: PluginJS.GmeConfig, payload: string): Promise<PluginJS.DataObject> => {
        if (!config.hasOwnProperty('uri')) {
            return Promise.reject(new Error('No uri provided.'));
        }
        let configDictionary: any = config
        return Promise
            .try(() => {
                return this.blobClient.createArtifact('pushed');
            })
            .then((artifact) => {
                let pushedFileName = configDictionary['uri'];
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
    }

    getSchemaTree = (core: PluginJS.Core,
        rootNode: PluginJS.Node, metaNode: Node): void => {
        let fcoName: string = attrToString(core.getAttribute(core.getFCO(this.rootNode), 'name'));
        let languageName: string = attrToString(core.getAttribute(this.rootNode, 'name'));
        this.logger.info('get schema tree with : ' + fcoName + ' : ' + languageName);
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
            let nodeData: PluginJS.Dictionary = { 'type': languageName + ':' + containRel };
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
                    let targetPath = pathToString(core.getPointerPath(node, ptrName));
                    if (!targetPath) return;
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
        rootNode: PluginJS.Node, metaNode: Node): void => {
        let fcoName: string = attrToString(core.getAttribute(core.getFCO(this.rootNode), 'name'));
        let languageName: string = attrToString(core.getAttribute(this.rootNode, 'name'));
        this.logger.info('get schema edges : ' + languageName + ' : ' + fcoName);
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
            'version': '0.0.1'
        };
        data[languageName] = fcoName;

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
            let nodeData: PluginJS.Dictionary = { 'type': languageName + ':' + containRel };
            path2data[nodePath] = nodeData;

            let parent: PluginJS.Node = core.getParent(node);
            let parentPath: string = core.getPath(parent);
            let parentData: PluginJS.Dictionary = path2data[parentPath];
            parentData[containRel] = parentData[containRel] || [];
            parentData[containRel].push(nodeData);

            nodeData['id'] = core.getGuid(node);
            core.getAttributeNames(node).forEach((attrName: string) => {
                nodeData[attrName] = core.getAttribute(node, attrName);
            });

            // get Pointers
            Promise
                .try(() => {
                    return core.getPointerNames(node);
                })
                .map((ptrName: string) => {
                    let targetPath = pathToString(core.getPointerPath(node, ptrName));
                    if (!targetPath) return;
                    Promise
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
                return data;
            });
    }
}

export = StreamingPlugin;
