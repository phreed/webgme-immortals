/*globals define*/
/*jshint node:true, browser:true*/
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define(["require", "exports", 'plugin/PluginBase', 'text!./metadata.json'], function (require, exports, PluginBase, MetaDataStr) {
    "use strict";
    var REF_PREFIX = '#//';
    var POINTER_SET_DIV = '-';
    var CONTAINMENT_PREFIX = '';
    var ROOT_NAME = 'ROOT';
    var NS_URI = 'www.webgme.org';
    var DATA_TYPE_MAP = {
        string: 'ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString',
        float: 'ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EFloat',
        integer: 'ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EInt',
        boolean: 'ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EBoolean',
        asset: 'ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString'
    };
    var StreamingPlugin = (function (_super) {
        __extends(StreamingPlugin, _super);
        function StreamingPlugin() {
            _super.call(this);
            this.pluginMetadata = JSON.parse(MetaDataStr);
        }
        /**
          Main function for the plugin to execute. This will perform the execution.
          Notes:
         - Always log with the provided logger.[error,warning,info,debug].
          - Do NOT put any user interaction logic UI, etc. inside this method.
          - callback always has to be called even if error happened.
      
          @param {function(string, plugin.PluginResult)} callback - the result callback
         */
        StreamingPlugin.prototype.main = function (mainHandler) {
            var _this = this;
            var core = this.core;
            var config = this.getCurrentConfig();
            if (!config.hasOwnProperty('fileName')) {
                mainHandler(new Error('No file name provided.'), this.result);
            }
            var recorder = function () {
                var payload;
                var artifact = _this.blobClient.createArtifact('serialized');
                artifact.addFile(config['fileName'], payload, function (err) {
                    if (err) {
                        mainHandler(err, _this.result);
                        return;
                    }
                    artifact.save(function (err, hash) {
                        if (err) {
                            mainHandler(err, _this.result);
                            return;
                        }
                        _this.result.addArtifact(hash);
                        _this.result.setSuccess(true);
                        mainHandler(null, _this.result);
                    });
                });
            };
            /**
            Visitor function.
            */
            var languageName = core.getAttribute(this.rootNode, 'name');
            var data = {
                '@xmi:version': '2.0',
                '@xmlns:xmi': 'http://www.omg.org/XMI',
                '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance'
            };
            var fcoName = core.getAttribute(core.getFCO(this.rootNode), 'name');
            var path2data = {};
            data['@xmlns:' + languageName] = NS_URI;
            data['@xsi:schemaLocation'] = NS_URI + ' ' + languageName + '.ecore';
            path2data[''] = data;
            function visitFn(node, nextFn) {
                var _this = this;
                var core = this.core;
                var deferred = Q.defer();
                // let nodeName = core.getAttribute(node, 'name');
                var parent = core.getParent(node);
                var parentData = path2data[core.getPath(parent)];
                var metaNode = core.getBaseType(node);
                // metaNode ?
                var metaName = core.getAttribute(metaNode, 'name') || ':LibraryRoot:';
                var containRel = CONTAINMENT_PREFIX + core.getAttribute(metaNode, 'name');
                var nodeData = { '@xsi:type': languageName + ':' + containRel };
                var baseNode = core.getBase(node);
                var promises = [];
                var nodePath = core.getPath(node);
                path2data[nodePath] = nodeData;
                parentData[containRel] = parentData[containRel] || [];
                parentData[containRel].push(nodeData);
                nodeData['@_id'] = core.getGuid(node);
                core.getAttributeNames(node).forEach(function (attrName) {
                    nodeData['@' + attrName] = core.getAttribute(node, attrName);
                });
                // get Pointers
                core.getPointerNames(node).forEach(function (ptrName) {
                    var targetPath = core.getPointerPath(node, ptrName);
                    if (targetPath) {
                        promises.push(core.loadByPath(_this.rootNode, targetPath)
                            .then(function (targetNode) {
                            if (ptrName === 'base') {
                                nodeData['@' + ptrName + POINTER_SET_DIV + fcoName]
                                    = core.getGuid(targetNode);
                            }
                            else {
                                var targetMetaNode = core.getBaseType(targetNode);
                                var targetMetaName = core.getAttribute(targetMetaNode, 'name');
                                nodeData['@' + ptrName + POINTER_SET_DIV + targetMetaName]
                                    = core.getGuid(targetNode);
                            }
                        }));
                    }
                });
                // get Sets
                Q.all(promises)
                    .then(deferred.resolve)
                    .catch(deferred.reject);
                return deferred.promise.nodeify(nextFn);
            }
            /**
            Visit the node and perform the function.
            */
            this.core
                .traverse(this.rootNode, { excludeRoot: true }, visitFn)
                .then(function () {
                console.log("DATA: " + data);
                return data;
            });
        };
        return StreamingPlugin;
    }(PluginBase));
    return StreamingPlugin;
});
//# sourceMappingURL=StreamingPlugin.js.map