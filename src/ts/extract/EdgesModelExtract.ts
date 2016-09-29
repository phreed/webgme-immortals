import Promise = require("bluebird");
import PluginBase = require("plugin/PluginBase");
import { attrToString, pathToString } from "utility/gmeString";

import { PruningFlag } from "serializer/filters";

/**
    * Get the schema from the nodes having meta rules.
    * https://github.com/webgme/webgme/wiki/GME-Core-API#the-traverse-method
    * sponsor function makes extensive use of a dictionary to build tuples.
    *
    * @param {PluginJS.Core}     core        [description]
    * @param {Node}              rootNode    [description]
    * @param {PluginJS.Callback} mainHandler [description]
    */
export function getEdgesModel(sponsor: PluginBase, core: PluginJS.Core,
    _rootNode: PluginJS.Node, _metaNode: Node): PluginJS.Dictionary {

    // let config = sponsor.getCurrentConfig();
    // let configDictionary: any = config;

    let fcoName: string = attrToString(core.getAttribute(core.getFCO(sponsor.rootNode), "name"));
    let languageName: string = attrToString(core.getAttribute(sponsor.rootNode, "name"));
    sponsor.logger.info("get model edges : " + languageName + " : " + fcoName);

    let rootEntry: PluginJS.Dictionary
        = {
            "version": "0.0.1",
            "pointers": {}, "reverses": {},
            "sets": {},
            "base": {
                "name": "Object",
                "guid": "00000000-0000-0000-0000-000000000000"
            },
            "name": { "name": fcoName },
            "type": { "domain": languageName },
            "attributes": {},
            "children": {},
            "prune": PruningFlag.None,
            "guid": "00000000-0000-0000-0000-000000000000"
        };
    let nodeGuidMap: PluginJS.Dictionary = {
        "00000000-0000-0000-0000-000000000000": rootEntry
    };

    sponsor.logger.info("A dictionary: look up nodes based on their path name.");
    let path2entry: PluginJS.Dictionary = { "": rootEntry };

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
                // console.log("pruned: " + nodePath + "::" + pl);
                prunedRootPath = pl;
            }

            let nodeNameAttr = core.getAttribute(node, "name");
            if (typeof nodeNameAttr !== "string") { return; }

            let nodeName: string = nodeNameAttr;
            sponsor.logger.info("visitor function with : " + nodeName);

            let baseNodeGuid: string = core.getGuid(core.getBase(node));
            let baseNodeTypeGuid: string = core.getGuid(core.getBaseType(node));
            let baseNodeRootGuid: string = core.getGuid(core.getBaseRoot(node));

            // set the nodes sourceGuid
            let sourceGuid: string = core.getGuid(node);
            let sourceEntry: PluginJS.Dictionary
                = Object.assign({
                    "guid": sourceGuid,
                    "name": {},
                    "type": {
                        "domain": languageName,
                        "meta": baseNodeTypeGuid,
                        "root": baseNodeRootGuid,
                        "base": baseNodeGuid
                    },
                    "pointers": {}, "reverses": {},
                    "sets": {},
                    "base": {
                        "name": "FCO",
                        "guid": "00000000-0000-0000-0000-000000000000"
                    },
                    "attributes": {},
                    "children": {},
                    "prune": PruningFlag.None
                }, nodeGuidMap[sourceGuid]);

            nodeGuidMap[sourceGuid] = sourceEntry;

            let metaName: string;
            if (node === sponsor.rootNode) {
                metaName = ":Root:";
                sourceEntry["type"] = {
                    "ns": "cp",
                    "name": "GmeInterchangeFormat"
                };
            } else if (core.isLibraryRoot(node)) {
                metaName = ":LibraryRoot:";

                // console.log("prune: " + nodePath);
                pruneList.push(nodePath);
                prunedRootPath = nodePath;
            } else {
                let metaNameAttr = core.getAttribute(core.getBaseType(node), "name");
                if (typeof metaNameAttr !== "string") { return; }
                metaName = metaNameAttr;
            }
            let containRel = metaName;
            sourceEntry["type"]["parent"] = containRel;
            sourceEntry["prune"] = (prunedRootPath === null) ? PruningFlag.None : PruningFlag.Library;
            path2entry[nodePath] = sourceEntry;

            // set the parent to know its child the root node has no parent
            // if a non-pruned item has a pruned parent then bring it in.
            if (node !== sponsor.rootNode) {
                let parent: PluginJS.Node = core.getParent(node);
                let parentPath: string = core.getPath(parent);

                let parentData: PluginJS.Dictionary = path2entry[parentPath];
                let children = parentData["children"];
                children[containRel] = children[containRel] || [];
                // children[containRel].push(sourceEntry);
                children[containRel].push(sourceGuid);
            }

            // set the nodes attributes
            core.getAttributeNames(node).forEach((attrName: string) => {
                let attrValue = core.getAttribute(node, attrName);

                if (attrName.match("url*")) {
                    sourceEntry["name"][attrName] = attrValue;
                } else if (attrName === "name") {
                    sourceEntry["name"][attrName] = attrValue;
                } else {
                    sourceEntry["attributes"][attrName] = attrValue;
                }
            });

            // get pointers & referred (reverse-pointer)
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
                                sourceEntry["base"] = {
                                    name: fcoName,
                                    guid: targetGuid
                                };
                            } else {
                                let pointers = sourceEntry["pointers"];
                                let targetMetaNode = core.getBaseType(targetNode);
                                let targetMetaName = core.getAttribute(targetMetaNode, "name");
                                pointers[ptrName] = {
                                    name: targetMetaName,
                                    guid: targetGuid
                                };
                                let targetEntry = nodeGuidMap[targetGuid];
                                if (targetEntry === undefined) {
                                    targetEntry = {
                                        "name": {},
                                        "guid": targetGuid,
                                        "pointers": {}, "reverses": {}
                                    };
                                    nodeGuidMap[targetGuid] = targetEntry;
                                }
                                targetEntry["reverses"][ptrName] = {
                                    name: targetMetaName,
                                    guid: sourceGuid
                                };
                            }
                        });
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
