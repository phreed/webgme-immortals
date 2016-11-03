
import Promise = require("bluebird");
import PluginBase = require("plugin/PluginBase");
import { attrToString, pathToString } from "utility/gmeString";

const POINTER_SET_DIV = "-";
const CONTAINMENT_PREFIX = "";

/**
     * Get the schema from the nodes having meta rules.
     * https://github.com/webgme/webgme/wiki/GME-Core-API#the-traverse-method
     * sponsor function makes extensive use of a dictionary to build up a tree.
     *
     * @param {Core.Core}     core        [description]
     * @param {Node}              rootNode    [description]
     * @param {Core.Callback} mainHandler [description]
     */
export function getTreeModel(sponsor: PluginBase, core: Core.Core,
    _rootNode: Common.Node, _metaNode: Node): Core.Dictionary {
    // let config: Config.GmeConfig = sponsor.getCurrentConfig();
    // let configDictionary: Core.Dictionary = config;

    /**
    * Visitor function store.
    */
    let fcoName: string = attrToString(core.getAttribute(core.getFCO(sponsor.rootNode), "name"));
    let languageName: string = attrToString(core.getAttribute(sponsor.rootNode, "name"));
    sponsor.logger.info(`get model tree : ${languageName}:${fcoName}`);
    let rootEntry: Core.Dictionary = {
        "version": "0.0.1"
    };
    /**
     * A dictionary: look up nodes based on their path name.
     */
    let path2entry: Core.Dictionary = { "": rootEntry };

    /**
     * The base node makes reference to inheritance.
     * The parent node makes reference to containment.
     * The traverse function follows the containment tree.
     * @type {[type]}
     */
    let visitFn = (node: Node, done: Core.VoidFn): void => {
        let core = sponsor.core;
        // let nodeName = core.getAttribute(node, "name");

        let metaName = (core.isLibraryRoot(node))
            ? ":LibraryRoot:"
            : core.getAttribute(core.getBaseType(node), "name");
        let containRel = `${CONTAINMENT_PREFIX}${metaName}`;
        let sourceEntry: Core.Dictionary = { "lang": `${languageName}:${containRel}` };
        // let baseNode = core.getBase(node);
        let nodePath = core.getPath(node);
        path2entry[nodePath] = sourceEntry;

        let parent = core.getParent(node);
        let parentPath = core.getPath(parent);
        let parentData = path2entry[parentPath];
        parentData[containRel] = parentData[containRel] || [];
        parentData[containRel].push(sourceEntry);

        sourceEntry["id"] = core.getGuid(node);
        core.getAttributeNames(node).forEach((attrName: string) => {
            sourceEntry[attrName] = core.getAttribute(node, attrName);
        });

        Promise
            .try(() => {
                // get pointers
                return core.getPointerNames(node);
            })
            .map((ptrName: string) => {
                let targetPathRaw = pathToString(core.getPointerPath(node, ptrName));
                if (typeof targetPathRaw !== "string") { return; }
                let targetPath: string = targetPathRaw;
                return Promise
                    .try(() => {
                        return core.loadByPath(sponsor.rootNode, targetPath);
                    })
                    .then((targetNode: Node) => {
                        if (ptrName === "base") {
                            sourceEntry[`${ptrName}${POINTER_SET_DIV}${fcoName}`]
                                = core.getGuid(targetNode);
                        } else {
                            let targetMetaNode = core.getBaseType(targetNode);
                            let targetMetaName = core.getAttribute(targetMetaNode, "name");
                            sourceEntry[`${ptrName}${POINTER_SET_DIV}${targetMetaName}`]
                                = core.getGuid(targetNode);
                        }
                    });
            });

        Promise
            .try(() => {
                // get sets
                return core.getSetNames(node);
            })
            .map((setName: string) => {
                return Promise
                    .try(() => {
                        return core.getMemberPaths(node, setName);
                    })
                    .map((memberPath: string) => {
                        return Promise
                            .try(() => {
                                return core.loadByPath(sponsor.rootNode, memberPath);
                            })
                            .then((memberNode: Node) => {
                                let memberMetaNode = core.getBaseType(memberNode);
                                let memberMetaName = core.getAttribute(memberMetaNode, "name");
                                let setAttr = `${setName}${POINTER_SET_DIV}${memberMetaName}`;

                                sourceEntry[setAttr] = typeof sourceEntry[setAttr] === "string"
                                    ? `${sourceEntry[setAttr]} ${core.getGuid(memberNode)}`
                                    : core.getGuid(memberNode);
                            });
                    });
            });
        done();
    };

    /**
    * Visit the node and perform the function.
    * Documentation for traverse.
    * https://github.com/webgme/webgme/wiki/GME-Core-API#the-traverse-method
    * Related example using traverse.
    * https://github.com/webgme/xmi-tools/blob/master/src/plugins/XMIExporter/XMIExporter.js#L430
    */
    return Promise
        .try(() => {
            return core.traverse(sponsor.rootNode, { excludeRoot: true }, visitFn);
        })
        .then(() => {
            console.log(`DATA: ${rootEntry}`);
            return rootEntry;
        });
}
