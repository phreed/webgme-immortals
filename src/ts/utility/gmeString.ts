
import PluginBase = require('plugin/PluginBase');

export function attrToString(attr: PluginJS.OutAttr): string {
    if (typeof attr !== 'string') {
        throw new Error("attribute value is not a string");
    }
    return attr;
}

export function pathToString(path: PluginJS.OutPath): string {
    if (typeof path !== 'string') {
        throw new Error("path value is not a string");
    }
    return path;
}
