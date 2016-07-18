/*globals define*/
/*jshint node:true, browser:true*/
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define(["require", "exports", 'plugin/PluginBase', 'text!./metadata.json'], function (require, exports, PluginBase, MetaDataStr) {
    "use strict";
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
        StreamingPlugin.prototype.main = function (callback) {
            var _this = this;
            var config = this.getCurrentConfig();
            if (!config.hasOwnProperty('fileName')) {
                callback(new Error('No file name provided.'), this.result);
            }
            var artifact = this.blobClient.createArtifact('serialized');
            artifact.addFile(config['fileName']);
            /**
            Visit the node and perform the function.
            */
            this.core.traverse(this.rootNode, { excludeRoot: true }, function (node, finishFn) {
                var core = _this.core;
                var metaNode = core.getBaseType(node);
                var nodeName = core.getAttribute(node, 'name');
                // Library-roots do not have a meta-type.
                var metaName = metaNode ? core.getAttribute(metaNode, 'name') : ':LibraryRoot:';
                console.log(nodeName, 'at', core.getPath(node), 'is of meta type', metaName);
                finishFn();
            }, function (err) {
                if (err) {
                    _this.logger.error('This is an error message.');
                }
                else {
                    console.log('At this point we have successfully visited all nodes.');
                }
            });
        };
        return StreamingPlugin;
    }(PluginBase));
    return StreamingPlugin;
});
//# sourceMappingURL=StreamingPlugin.js.map