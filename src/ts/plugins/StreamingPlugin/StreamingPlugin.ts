/*globals define*/
/*jshint node:true, browser:true*/

/**
 *
 * A plugin that inherits from the PluginBase.
 * To see source code documentation about available
 * properties and methods visit %host%/docs/source/PluginBase.html.
 https://github.com/webgme/xmi-tools/blob/master/src/plugins/XMIExporter/XMIExporter.js#L430

 */

import PluginBase = require('plugin/PluginBase');
import PluginConfig = require('plugin/PluginConfig');
import MetaDataStr = require('text!./metadata.json');

import Promise = require('bluebird');
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
    main(mainHandler: PluginJS.Callback): void {
        // Use self to access core, project, result, logger etc from PluginBase.
        // These are all instantiated at this point.
        this.getSchema(this.core, this.rootNode, this.META)
            .then((schema: Object) => {
                var languageName = this.core.getAttribute(this.rootNode, 'name');
                return Promise.all([
                    this.writeFile(languageName + '.json', schema)
                ]);
            })
            .then(() => {
                this.result.setSuccess(true);
                mainHandler(null, this.result);
            })
            .catch((err: Error) => {
                this.logger.error(err.stack);
                mainHandler(err, this.result);
            });
    };

    /**
     * Save the content to the filename indicated.
     *
     * @param  {string} fName   [description]
     * @param  {any}    content [description]
     * @return {[type]}         [description]
     */
    writeFile = (fName: string, content: any) => {
        if (typeof window === 'undefined' && process.env.WRITE_FILES) {
            let fs = require('fs');
            return Promise.try(() => {
                fs.writeFile(fName, content);
            });
        }
        return this.blobClient.putFile(fName, content)
            .then((metaModelHash) => {
                this.result.addArtifact(content);
            });
    };
    /**
     * Post the content to the url indicated.
     *
     * @param  {string} url     [description]
     * @param  {any}    content [description]
     * @return {[type]}         [description]
     */
    writeUrl = (url: string, content: any) => {
        if (typeof window === 'undefined' && process.env.WRITE_FILES) {
            let fs = require('fs');
            return Promise.try(() => {
                fs.writeFile(url, content);
            });
        }
        return this.blobClient.putFile(url, content)
            .then((metaModelHash) => {
                this.result.addArtifact(content);
            });
    };
    /**
     * Write the content to the stream indicated.
     *
     * @param  {string} ostream     [description]
     * @param  {any}    content [description]
     * @return {[type]}         [description]
     */
    writeStream = (stream: string, content: any) => {
        if (typeof window === 'undefined' && process.env.WRITE_FILES) {
            let fs = require('fs');
            return Promise.try(() => {
                return fs.writeFile(stream, content);
            });
        }
        return Promise.try(() => {
            return this.blobClient.putFile(stream, content);
        })
            .then((metaModelHash: any) => {
                return this.result.addArtifact(metaModelHash);
            });
    };

    /**
     * Get the schema from the nodes having meta rules.
     * https://github.com/webgme/webgme/wiki/GME-Core-API#the-traverse-method
     * @param {PluginJS.Core}     core        [description]
     * @param {Node}              rootNode    [description]
     * @param {PluginJS.Callback} mainHandler [description]
     */
    getSchema = (core: PluginJS.Core, rootNode: PluginJS.Node, metaNode: Node): Promise<Object> => {
        let config = this.getCurrentConfig();
        let configDictionary: any = config;
        if (!configDictionary.hasOwnProperty('fileName')) {
            return Promise.reject(new Error('No file name provided.'));
        }
        let recorder = () => {
            let payload: BlobJS.ObjectBlob;
            Promise
                .try(() => {
                    return this.blobClient.createArtifact('serialized');
                })
                .then((artifact) => {
                    Promise
                        .try(() => {
                            return artifact.addFile(configDictionary['fileName'], payload);
                        })
                        .then((file) => {
                            return artifact.save();
                        })
                        .then((hash) => {
                            this.result.addArtifact(hash);
                            this.result.setSuccess(true);
                            return Promise.resolve(this.result);
                        })
                        .catch((err: Error) => {
                            return Promise.reject(new Error('could not add file to artifact'));
                        });
                })
                .catch((err: Error) => {
                    return Promise.reject(new Error('could not create artifact'));
                });
        };
        /**
        * Visitor function.
        */

        let fcoName = core.getAttribute(core.getFCO(this.rootNode), 'name');

        let data: PluginJS.Dictionary = {
            '@xmi:version': '2.0',
            '@xmlns:xmi': 'http://www.omg.org/XMI',
            '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance'
        };
        let languageName = core.getAttribute(this.rootNode, 'name');
        data['@xmlns:' + languageName] = NS_URI;
        data['@xsi:schemaLocation'] = NS_URI + ' ' + languageName + '.ecore';

        /**
         * A dictionary to look up nodes based on their path name.
         * @type {PluginJS.Dictionary}
         */
        let path2data: PluginJS.Dictionary = { '': data };

        let visitFn = (node: Node, nextFn: PluginJS.VoidCallback): Promise<Object> => {
            let core = this.core;
            let deferred = Promise.defer();
            // let nodeName = core.getAttribute(node, 'name');

            let metaName = (core.isLibraryRoot(node))
                ? ':LibraryRoot:'
                : core.getAttribute(core.getBaseType(node), 'name');
            let containRel = CONTAINMENT_PREFIX + metaName;
            let nodeData: PluginJS.Dictionary = { '@xsi:type': languageName + ':' + containRel };
            let baseNode = core.getBase(node);
            let promises: any[] = [];
            let nodePath = core.getPath(node);

            let parent = core.getParent(node);
            let parentPath = core.getPath(parent);
            let parentData = path2data[parentPath];
            path2data[nodePath] = nodeData;
            parentData[containRel] = parentData[containRel] || [];
            parentData[containRel].push(nodeData);

            nodeData['@_id'] = core.getGuid(node);
            core.getAttributeNames(node).forEach((attrName: string) => {
                nodeData['@' + attrName] = core.getAttribute(node, attrName);
            });


            // get Pointers
            core.getPointerNames(node).forEach((ptrName: string) => {
                let targetPath = core.getPointerPath(node, ptrName);
                if (targetPath) {
                    promises.push(
                        core.loadByPath(this.rootNode, targetPath)
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
                    );
                }
            });

            // get Sets

            Promise.all(promises)
                .then(deferred.resolve)
                .catch(deferred.reject);
            return deferred.promise.nodeify(nextFn);
        }

        /**
        Visit the node and perform the function.
        */
        Promise
            .try(() => {
                return core.traverse(this.rootNode, { excludeRoot: true }, visitFn);
            })
            .then((data) => {
                console.log("DATA: " + data);
                return data;
            })
            .catch();
    }
}

export = StreamingPlugin;
