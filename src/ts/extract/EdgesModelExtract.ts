

/**
* Get the schema from the nodes having meta rules.
* https://github.com/webgme/webgme/wiki/GME-Core-API#the-traverse-method
* sponsor function makes extensive use of a dictionary to build tuples.
*
* @param {PluginJS.Core}     core        [description]
* @param {Node}              rootNode    [description]
* @param {PluginJS.Callback} mainHandler [description]
*/

import Promise = require("bluebird");
import PluginBase = require("plugin/PluginBase");
import { attrToString, pathToString } from "utility/gmeString";

import { PruningFlag } from "serializer/filters";
import * as nt from "utility/NodeType";

const BLANK = "";

export function getEdgesModel(sponsor: PluginBase, core: PluginJS.Core,
    _rootNode: PluginJS.Node, _metaNode: Node): PluginJS.Dictionary {

    // let config = sponsor.getCurrentConfig();
    // let configDictionary: any = config;

    let fcoName: string = attrToString(core.getAttribute(core.getFCO(sponsor.rootNode), "name"));
    let languageName: string = attrToString(core.getAttribute(sponsor.rootNode, "name"));
    sponsor.logger.info(`get model edges : ${languageName} : ${fcoName}`);

    let rootEntry
        = <nt.Subject>{
            "version": "0.0.1",
            "pointers": {}, "inv_pointers": {},
            "sets": {}, "inv_sets": {},
            "base": {
                "name": "Object",
                "guid": "00000000-0000-0000-0000-000000000000"
            },
            "name": {
                "name": fcoName, "uriExt": BLANK, "uriPrefix": BLANK,
                "uriName": BLANK, "uriGen": BLANK
            },
            "type": {
                "domain": languageName,
                "meta": BLANK, "root": BLANK, "base": BLANK, "parent": BLANK
            },
            "attributes": {},
            "children": {},
            "prune": PruningFlag.None,
            "guid": "00000000-0000-0000-0000-000000000000"
        };
    let nodeGuidMap: PluginJS.Dictionary = {
        "00000000-0000-0000-0000-000000000000": rootEntry
    };

    sponsor.logger.info("A dictionary: look up nodes based on their path name.");
    let path2entry: PluginJS.Dictionary = { BLANK: rootEntry };

    /**
     * A filter mechanism to effectively eliminate containment branches.
     * Any path included in the prune-list will be the root of a 
     * pruned subtree.
     */
    let pruneList: string[] = [];

    /**
     * The base node makes reference to inheritance.
     * The parent node makes reference to containment.
     * The traverse function follows the containment tree.
     * @type {[type]}
     */
    let visitFn = (node: Node, done: PluginJS.VoidFn): void => {
        try {
            let core = sponsor.core;
            let nodePath: string = core.getPath(node);

            let prunedRootPath: string | null = null;
            for (let pl of pruneList) {
                if (nodePath.indexOf(pl) !== 0) { continue; }
                // console.log(`pruned: ${nodePath}::${pl}`);
                prunedRootPath = pl;
            }

            let nodeNameAttr = core.getAttribute(node, "name");
            if (typeof nodeNameAttr !== "string") { return; }

            let nodeName: string = nodeNameAttr;
            sponsor.logger.info(`visitor function with ${nodeName}`);

            let baseNodeGuid: string = core.getGuid(core.getBase(node));
            let baseNodeTypeGuid: string = core.getGuid(core.getBaseType(node));
            let baseNodeRootGuid: string = core.getGuid(core.getBaseRoot(node));

            // set the nodes sourceGuid
            let sourceGuid: string = core.getGuid(node);
            let sourceEntry: nt.Subject
                = Object.assign({},
                    nodeGuidMap[sourceGuid],
                    <nt.Subject>{
                        "guid": sourceGuid,
                        "name": {},
                        "type": {
                            "domain": languageName,
                            "meta": baseNodeTypeGuid,
                            "root": baseNodeRootGuid,
                            "base": baseNodeGuid
                        },
                        "pointers": {}, "inv_pointers": {},
                        "sets": {}, "inv_sets": {},
                        "base": {
                            "name": "FCO",
                            "guid": "00000000-0000-0000-0000-000000000000"
                        },
                        "attributes": {},
                        "children": {},
                        "prune": PruningFlag.None
                    });
            nodeGuidMap[sourceGuid] = sourceEntry;

            let metaName: string;
            if (node === sponsor.rootNode) {
                metaName = ":Root:";
                sourceEntry.type = {
                    "domain": "cp",
                    "name": "GmeInterchangeFormat",
                    "meta": BLANK,
                    "root": BLANK,
                    "base": BLANK,
                    "parent": BLANK
                };
            } else if (core.isLibraryRoot(node)) {
                metaName = ":LibraryRoot:";

                // console.log(`prune: ${nodePath}`);
                pruneList.push(nodePath);
                prunedRootPath = nodePath;
            } else {
                let metaNameAttr = core.getAttribute(core.getBaseType(node), "name");
                if (typeof metaNameAttr !== "string") { return; }
                metaName = metaNameAttr;
            }
            let containRel = metaName;
            sourceEntry.type.parent = containRel;
            sourceEntry.prune = (prunedRootPath === null) ? PruningFlag.None : PruningFlag.Library;

            path2entry[nodePath] = sourceEntry;

            // set the parent to know its child the root node has no parent
            // if a non-pruned item has a pruned parent then bring it in.
            if (node !== sponsor.rootNode) {
                let parent: PluginJS.Node = core.getParent(node);
                let parentPath: string = core.getPath(parent);

                let parentData: nt.Subject = path2entry[parentPath];
                let children = parentData.children;
                children[containRel] = children[containRel] || [];
                // children[containRel].push(sourceEntry);
                children[containRel].push(sourceGuid);
            }

            // set the nodes attributes
            core.getAttributeNames(node).forEach((attrName: string) => {
                let attrValueRaw = core.getAttribute(node, attrName);
                let attrValue: string;
                if (typeof attrValueRaw === "string") {
                    attrValue = attrValueRaw;
                } else {
                    attrValue = "<undefined>";
                }
                let sen = sourceEntry.name;
                switch (attrName) {
                    case "uriName": sen.uriName = attrValue; break;
                    case "uriExt": sen.uriExt = attrValue; break;
                    case "uriGen": sen.uriGen = attrValue; break;
                    case "uriPrefix": sen.uriPrefix = attrValue; break;
                    case "name": sen.name = attrValue; break;
                    default:
                        if (typeof attrValue === "string") {
                            sourceEntry.attributes[attrName] = attrValue;
                        } else if (typeof attrValue === "number") {
                            sourceEntry.attributes[attrName] = attrValue;
                        } else if (typeof attrValue === "object") {
                            console.log(`problem with attribute value ${attrName}`);
                        }
                }
            });

            // get pointers & inv_pointers
            Promise
                .try(() => {
                    return core.getPointerNames(node);
                })
                .map((ptrName: string) => {
                    let targetPathRaw = pathToString(core.getPointerPath(node, ptrName));
                    if (typeof targetPathRaw !== "string") { return; }

                    let targetPath: string = targetPathRaw;
                    Promise
                        .try(() => {
                            return core.loadByPath(sponsor.rootNode, targetPath);
                        })
                        .then((targetNode: Node) => {
                            let targetGuid = core.getGuid(targetNode);
                            if (ptrName === "base") {
                                sourceEntry.base = {
                                    name: fcoName,
                                    guid: targetGuid
                                };
                            } else {
                                let pointers = sourceEntry.pointers;
                                let targetMetaNode = core.getBaseType(targetNode);
                                let targetMetaName = core.getAttribute(targetMetaNode, "name");
                                if (typeof targetMetaName === "string") {
                                    pointers[ptrName] = {
                                        name: targetMetaName,
                                        guid: targetGuid
                                    };
                                }
                                let targetEntry = nodeGuidMap[targetGuid];
                                if (targetEntry === undefined) {
                                    targetEntry = {
                                        "name": {},
                                        "guid": targetGuid,
                                        "pointers": {}, "inv_pointers": {},
                                        "sets": {}, "inv_sets": {}
                                    };
                                    nodeGuidMap[targetGuid] = targetEntry;
                                }
                                targetEntry.inv_pointers[ptrName] = {
                                    name: targetMetaName,
                                    guid: sourceGuid
                                };
                            }
                        });
                });

            // get sets & inv_set
            Promise
                .try(() => {
                    return core.getValidSetNames(node);
                })
                .map((setName: string) => {
                    let targetMemberPathsRaw = core.getMemberPaths(node, setName);
                    for (let targetMemberPath of targetMemberPathsRaw) {
                        if (typeof targetMemberPath !== "string") { return; }
                        let targetPath: string = targetMemberPath;

                        Promise
                            .try(() => {
                                return core.loadByPath(sponsor.rootNode, targetPath);
                            })
                            .then((targetNode: Node) => {
                                let targetGuid = core.getGuid(targetNode);
                                let sets = sourceEntry.sets;
                                let targetMetaNode = core.getBaseType(targetNode);
                                let targetMetaName = core.getAttribute(targetMetaNode, "name");
                                if (typeof targetMetaName === "string") {
                                    let load = {
                                        name: targetMetaName,
                                        guid: targetGuid
                                    };
                                    let sourceSet = sets[setName];
                                    if (sourceSet === undefined) {
                                        sets[setName] = [load];
                                    } else {
                                        sourceSet.push(load);
                                    }
                                }
                                let targetEntry = nodeGuidMap[targetGuid];
                                if (targetEntry === undefined) {
                                    targetEntry = {
                                        "name": {},
                                        "guid": targetGuid,
                                        "pointers": {}, "inv_pointers": {},
                                        "sets": {}, "inv_sets": {}
                                    };
                                    nodeGuidMap[targetGuid] = targetEntry;
                                }
                                let invSets = targetEntry.inv_sets;
                                let targetSet = invSets[setName];
                                let invLoad = {
                                    name: targetMetaName,
                                    guid: sourceGuid
                                };
                                if (targetSet === undefined) {
                                    invSets[setName] = [invLoad];
                                } else {
                                    targetSet.push(invLoad);
                                };
                            })
                            .catch((err: Error) => {
                                console.log(`difficulty loading target path: ${targetPath} with err: ${err.message}`);
                                let load = {
                                    "fault": `could not load member path: ${targetPath}`
                                };
                                let sets = sourceEntry.sets;
                                let sourceSet = sets[setName];
                                if (sourceSet === undefined) {
                                    sets[setName] = [load];
                                } else {
                                    sourceSet.push(load);
                                }
                            });
                    }
                });
        } finally {
            done();
        }
    };

    /**
    * Visit the node and perform the function.
    * Documentation for traverse.
    * https://github.com/webgme/webgme/wiki/GME-Core-API#the-traverse-method
    * Related example using traverse.
    * https://github.com/webgme/xmi-tools/blob/master/src/plugins/XMIExporter/XMIExporter.js#L430
    */
    return Promise
        .try<void>(() => {
            return core.traverse(sponsor.rootNode,
                { excludeRoot: false },
                visitFn);
        })
        .then(() => {
            return nodeGuidMap;
        });
}
