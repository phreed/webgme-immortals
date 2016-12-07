
import Promise = require("bluebird");
import PluginBase = require("plugin/PluginBase");
import { attrToString } from "utility/gmeString";

export function getTreeSchema(sponsor: PluginBase, core: GmeClasses.Core,
    _1: Core.Node, _2: Node): Promise<string> {
    let fcoName: string = attrToString(core.getAttribute(core.getFCO(sponsor.rootNode), "name"));
    let languageName: string = attrToString(core.getAttribute(sponsor.rootNode, "name"));
    sponsor.logger.info(`get schema tree with : ${fcoName} : ${languageName}`);
    return Promise
        .reject(new Error("get schema tree is not implemented"));
}

