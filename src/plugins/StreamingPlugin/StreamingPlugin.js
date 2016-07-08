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
         * Main function for the plugin to execute. This will perform the execution.
         * Notes:
         * - Always log with the provided logger.[error,warning,info,debug].
         * - Do NOT put any user interaction logic UI, etc. inside this method.
         * - callback always has to be called even if error happened.
         *
         * @param {function(string, plugin.PluginResult)} callback - the result callback
         */
        StreamingPlugin.prototype.main = function (callback) {
            var _this = this;
            var config = this.getCurrentConfig();
            console.log("main is running");
            // Using the logger.
            this.logger.debug('This is a debug message.');
            this.logger.info('This is an info message.');
            this.logger.warn('This is a warning message.');
            this.logger.error('This is an error message.');
            // Using the coreAPI to make changes.
            var nodeObject = this.activeNode;
            this.core.setAttribute(nodeObject, 'name', 'IMMoRTALS ROOT');
            this.core.setRegistry(nodeObject, 'position', { x: 70, y: 70 });
            // This will save the changes. If you don't want to save;
            // exclude self.save and call callback directly from this scope.
            this.save('streaming plugin updated model.')
                .then(function () {
                _this.result.setSuccess(true);
                callback(null, _this.result);
            })
                .catch(function (err) {
                // Result success is false at invocation.
                callback(null, _this.result);
            });
        };
        return StreamingPlugin;
    }(PluginBase));
    return StreamingPlugin;
});
//# sourceMappingURL=StreamingPlugin.js.map