/*globals define*/
/*jshint node:true, browser:true*/

/**
 *
 * A plugin that inherits from the PluginBase.
 * To see source code documentation about available
 * properties and methods visit %host%/docs/source/PluginBase.html.
 */

import PluginBase = require('plugin/PluginBase');
import PluginConfig = require('plugin/PluginConfig');
import MetaDataStr = require('text!./metadata.json');

import Promise = require('bluebird');
import _ = require('underscore');
import { amRunningOnServer } from 'utility';
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
const DATA_TYPE_MAP = {
    string: 'ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString',
    float: 'ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EFloat',
    integer: 'ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EInt',
    boolean: 'ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EBoolean',
    asset: 'ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString',
};

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
    public main(mainHandler: PluginJS.Callback): void {
        let config = this.getCurrentConfig();
        console.error("the StreamingPlugin function main is running");
        this.logger.info('serialize the model in the requested manner');
        let configDictionary: any = config;

        /**
        Push the current data-model into a JSON structure.
        */
        Promise
            .try(() => {
                return this.getSchemaTree(this.core, this.rootNode, this.META);
            })
            .then((jsonObject) => {
                return JSON.stringify(jsonObject, null, 4);
            })
            .then((jsonStr: string) => {
                return this.deliverFile(config, jsonStr);
            })
            .then(() => {
                mainHandler(null, this.result);
            })
            .catch((err) => {
                mainHandler(err, this.result);
            });
    }

    /**
     A function to deliver the serialized object properly.
    */
    private deliverFile = (config: PluginJS.GmeConfig, payload: string): Promise<Object> => {
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

    /**
     * Get the schema from the nodes having meta rules.
     * https://github.com/webgme/webgme/wiki/GME-Core-API#the-traverse-method
     * This function makes extensive use of a dictionary to build up a tree.
     *
     * @param {PluginJS.Core}     core        [description]
     * @param {Node}              rootNode    [description]
     * @param {PluginJS.Callback} mainHandler [description]
     */
    getSchemaTree = (core: PluginJS.Core,
        rootNode: PluginJS.Node, metaNode: Node) => {
        let config = this.getCurrentConfig();
        let configDictionary: any = config;

        /**
        * Visitor function.
        */

        let fcoName = core.getAttribute(core.getFCO(this.rootNode), 'name');
        let languageName = core.getAttribute(this.rootNode, 'name');
        let data: PluginJS.Dictionary = {
            '@xmi:version': '2.0',
            '@xmlns:xmi': 'http://www.omg.org/XMI',
            '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance'
        };
        data['@xmlns:' + languageName] = NS_URI;
        data['@xsi:schemaLocation'] = NS_URI + ' ' + languageName + '.ecore';

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
            let nodeData: PluginJS.Dictionary = { '@xsi:type': languageName + ':' + containRel };
            let baseNode = core.getBase(node);
            let nodePath = core.getPath(node);
            path2data[nodePath] = nodeData;

            let parent = core.getParent(node);
            let parentPath = core.getPath(parent);
            let parentData = path2data[parentPath];
            parentData[containRel] = parentData[containRel] || [];
            parentData[containRel].push(nodeData);

            nodeData['@_id'] = core.getGuid(node);
            core.getAttributeNames(node).forEach((attrName: string) => {
                nodeData['@' + attrName] = core.getAttribute(node, attrName);
            });

            Promise
                .try(() => {
                    // get pointers
                    return core.getPointerNames(node);
                })
                .map((ptrName: string) => {
                    let targetPath = core.getPointerPath(node, ptrName);
                    if (!targetPath) return;
                    return Promise
                        .try(() => {
                            return core.loadByPath(this.rootNode, targetPath);
                        })
                        .then((targetNode: Node) => {
                            if (ptrName === 'base') {
                                nodeData['@' + ptrName + POINTER_SET_DIV + fcoName]
                                    = core.getGuid(targetNode);
                            } else {
                                let targetMetaNode = core.getBaseType(targetNode);
                                let targetMetaName = core.getAttribute(targetMetaNode, 'name');
                                nodeData['@' + ptrName + POINTER_SET_DIV + targetMetaName]
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
                                    let setAttr = '@' + setName + POINTER_SET_DIV + memberMetaName;

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
            .try<void>(() => {
                return core.traverse(this.rootNode, { excludeRoot: true }, visitFn);
            })
            .then(() => {
                console.log("DATA: " + data);
                return data;
            });
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
    getSchemaEdges = (core: PluginJS.Core,
        rootNode: PluginJS.Node, metaNode: Node) => {
        let config = this.getCurrentConfig();
        let configDictionary: any = config;

        /**
        * Visitor function.
        */

        let fcoName = core.getAttribute(core.getFCO(this.rootNode), 'name');
        let languageName = core.getAttribute(this.rootNode, 'name');
        let data: PluginJS.Dictionary = {
            '@xmi:version': '2.0',
            '@xmlns:xmi': 'http://www.omg.org/XMI',
            '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance'
        };
        data['@xmlns:' + languageName] = NS_URI;
        data['@xsi:schemaLocation'] = NS_URI + ' ' + languageName + '.ecore';

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
            let nodeData: PluginJS.Dictionary = { '@xsi:type': languageName + ':' + containRel };
            let baseNode = core.getBase(node);
            let nodePath = core.getPath(node);
            path2data[nodePath] = nodeData;

            let parent = core.getParent(node);
            let parentPath = core.getPath(parent);
            let parentData = path2data[parentPath];
            parentData[containRel] = parentData[containRel] || [];
            parentData[containRel].push(nodeData);

            nodeData['@_id'] = core.getGuid(node);
            core.getAttributeNames(node).forEach((attrName: string) => {
                nodeData['@' + attrName] = core.getAttribute(node, attrName);
            });

            // get Pointers
            Promise
                .try(() => {
                    return core.getPointerNames(node);
                })
                .map((ptrName: string) => {
                    let targetPath = core.getPointerPath(node, ptrName);
                    if (!targetPath) return;
                    Promise
                        .try(() => {
                            return core.loadByPath(this.rootNode, targetPath);
                        })
                        .then((targetNode: Node) => {
                            if (ptrName === 'base') {
                                nodeData['@' + ptrName + POINTER_SET_DIV + fcoName]
                                    = core.getGuid(targetNode);
                            } else {
                                let targetMetaNode = core.getBaseType(targetNode);
                                let targetMetaName = core.getAttribute(targetMetaNode, 'name');
                                nodeData['@' + ptrName + POINTER_SET_DIV + targetMetaName]
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
                console.log("DATA: " + data);
                return data;
            });
    }
}

export = StreamingPlugin;
