
import PluginBase = require("plugin/PluginBase");
import { attrToString } from "utility/GmeString";

export function getEdgesSchema(sponsor: PluginBase, core: GmeClasses.Core,
    _rootNode: Core.Node, _metaNode: Node): Promise<string> {
    let fcoName: string = attrToString(core.getAttribute(core.getFCO(sponsor.rootNode), "name"));
    let languageName: string = attrToString(core.getAttribute(sponsor.rootNode, "name"));
    sponsor.logger.info(`get schema edges : ${languageName}::${fcoName}`);
    return Promise
        .reject(new Error("get schema edges is not implemented"));
}
