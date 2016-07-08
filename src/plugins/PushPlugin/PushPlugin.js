/*globals define*/
/*jshint node:true, browser:true*/
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define(["require", "exports", 'plugin/PluginBase', 'serialize/NewSerializer', 'serialize/FlatSerializer', 'serialize/CyjsSerializer', 'text!./metadata.json'], function (require, exports, PluginBase, NewSerializer_1, FlatSerializer_1, CyjsSerializer_1, MetaDataStr) {
    "use strict";
    var PushPlugin = (function (_super) {
        __extends(PushPlugin, _super);
        function PushPlugin() {
            _super.call(this);
            this.pluginMetadata = JSON.parse(MetaDataStr);
        }
        PushPlugin.prototype.main = function (mainHandler) {
            var _this = this;
            var config = this.getCurrentConfig();
            console.error("the main PushPlugin function is running");
            this.logger.info('serialize the model in the requested manner');
            var typedVersion = config['typedVersion'];
            switch (typedVersion) {
                case 'json-tree:1.0.0':
                    this.serializeTreeJson100(config, mainHandler, function (jsonStr) {
                        _this.deliver(config, mainHandler, jsonStr);
                    });
                    return;
                case 'json-flat:1.0.0':
                    this.serializeFlatJson100(config, mainHandler, function (jsonStr) {
                        _this.deliver(config, mainHandler, jsonStr);
                    });
                    return;
                case 'json-cytoscape:1.0.0':
                    this.serializeCytoscapeJson100(config, mainHandler, function (jsonStr) {
                        _this.deliver(config, mainHandler, jsonStr);
                    });
                    return;
                default:
                    this.result.setSuccess(false);
                    mainHandler(new Error("Unknown serialization type "), this.result);
                    return;
            }
        };
        PushPlugin.prototype.serializeFlatJson100 = function (config, mainHandler, deliveryFn) {
            var _this = this;
            var jsonStr;
            // an asynchronous call
            FlatSerializer_1["default"].export(this.core, this.activeNode, function (err, jsonObject) {
                if (err) {
                    mainHandler(err, _this.result);
                    return;
                }
                jsonStr = JSON.stringify(jsonObject.nodes, null, 4);
                deliveryFn(jsonStr);
            });
        };
        PushPlugin.prototype.serializeCytoscapeJson100 = function (config, mainHandler, deliveryFn) {
            var _this = this;
            var jsonStr;
            CyjsSerializer_1["default"].export(this.core, this.activeNode, function (err, jsonObject) {
                if (err) {
                    mainHandler(err, _this.result);
                    return;
                }
                jsonStr = JSON.stringify(jsonObject, null, 4);
                deliveryFn(jsonStr);
            });
        };
        /**
        Pushing the current data-model into a JSON structure.
        */
        PushPlugin.prototype.serializeTreeJson100 = function (config, mainHandler, deliveryFn) {
            var _this = this;
            var jsonStr;
            NewSerializer_1["default"].export(this.core, this.activeNode, function (err, jsonObject) {
                if (err) {
                    mainHandler(err, _this.result);
                    return;
                }
                jsonStr = JSON.stringify(jsonObject, null, 4);
                deliveryFn(jsonStr);
            });
        };
        /**
         A function to deliver the serialized object properly.
        */
        PushPlugin.prototype.deliver = function (config, mainHandler, payload) {
            var _this = this;
            var isProject = this.core.getPath(this.activeNode) === '';
            var pushedFileName;
            var artifact;
            switch (config['deliveryMode']) {
                case 'file':
                    if (!config.hasOwnProperty('fileName')) {
                        mainHandler(new Error('No file name provided.'), this.result);
                        return;
                    }
                    pushedFileName = config['fileName'];
                    artifact = this.blobClient.createArtifact('pushed');
                    this.logger.debug('Exported: ', pushedFileName);
                    artifact.addFile(pushedFileName, payload, function (err) {
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
                    break;
            }
        };
        return PushPlugin;
    }(PluginBase));
    return PushPlugin;
});
//# sourceMappingURL=PushPlugin.js.map