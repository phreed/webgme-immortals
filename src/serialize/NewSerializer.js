define(["require", "exports"], function (require, exports) {
    "use strict";
    var NewSerializer = (function () {
        function NewSerializer() {
        }
        NewSerializer.export = function (core, libraryRoot, callback) {
            console.error("export JSON library: not implemented");
        };
        NewSerializer.import = function (core, originalLibraryRoot, updatedJsonLibrary, callback) {
            console.error("import JSON library: not implemented");
        };
        return NewSerializer;
    }());
    exports.__esModule = true;
    exports["default"] = NewSerializer;
});
//# sourceMappingURL=NewSerializer.js.map