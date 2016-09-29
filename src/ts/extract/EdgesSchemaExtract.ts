import Promise = require("bluebird");
import PluginBase = require("plugin/PluginBase");
import { attrToString } from "utility/gmeString";

export function getEdgesSchema(sponsor: PluginBase, core: PluginJS.Core,
    _rootNode: PluginJS.Node, _metaNode: Node): Promise<string> {
    let fcoName: string = attrToString(core.getAttribute(core.getFCO(sponsor.rootNode), "name"));
    let languageName: string = attrToString(core.getAttribute(sponsor.rootNode, "name"));
    sponsor.logger.info(`get schema edges : ${languageName}::${fcoName}`);
    return Promise
        .reject(new Error("get schema edges is not implemented"));
}
