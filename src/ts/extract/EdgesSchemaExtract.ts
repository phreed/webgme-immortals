

/**
* Get the schema from the nodes having meta rules.
* https://github.com/webgme/webgme/wiki/GME-Core-API#the-traverse-method
* sponsor function makes extensive use of a dictionary to build tuples.
*
* @param {GmeClasses.Core}     core        [description]
* @param {Node}              rootNode    [description]
* @param {Core.Callback} mainHandler [description]
*/
import _ = require("underscore");

import PluginBase = require("plugin/PluginBase");
import { attrToString, pathToString } from "utility/GmeString";

import { PruningFlag } from "serializer/filters";
import * as nt from "utility/NodeType";
import { explainGenealogy } from "utility/Reasons";
import { getCoreGuid } from "utility/CoreExtras";

/**
 * This method uses the visitor pattern to examine each node.
 * The goal is to produce a tree over the containment model.
 */
export async function get(sponsor: PluginBase, core: GmeClasses.Core,
    _rootNode: Core.Node, _metaNode: Node): Promise<Map<string, nt.Subject>> {

    let fcoName: string = attrToString(core.getAttribute(core.getFCO(sponsor.rootNode), "name"));
    let languageName: string = attrToString(core.getAttribute(sponsor.rootNode, "name"));
    sponsor.logger.info(`get model edges : ${languageName} : ${fcoName}`);

    let rootEntry = nt.Subject.makeRoot(languageName);

    let nodeGuidMap = new Map<string, nt.Subject>();
    nodeGuidMap.set(nt.NULL_GUID, rootEntry);

    sponsor.logger.info("A dictionary: look up nodes based on their path name.");
    let path2entry = new Map<string, nt.Subject>();
    path2entry.set(nt.BLANK, rootEntry);

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
    let visitFn = async (node: Core.Node, done: GmeCommon.VoidFn): Promise<void> => {
        try {
            let core = sponsor.core;
            let nodePath: string = core.getPath(node);

            let prunedRootPath: string | null = null;
            pruneList.forEach((pl) => {
                if (nodePath.indexOf(pl) !== 0) { return; }
                sponsor.logger.info(`pruned: ${nodePath}::${pl}`);
                prunedRootPath = pl;
            });

            let nodeNameAttr = core.getAttribute(node, "name");
            if (typeof nodeNameAttr !== "string") { return; }

            // sponsor.logger.info(`visitor function with ${nodeNameAttr}`);
            let baseNode = core.getBase(node);
            let baseNodeGuid: string;
            let baseNodeTypeGuid: string;
            let baseNodeRootGuid: string;
            if (baseNode === null) {
                baseNodeGuid = "NULL";
                baseNodeTypeGuid = "NULL";
                baseNodeRootGuid = "NULL";
            } else {
                baseNodeGuid = getCoreGuid(core, baseNode);
                baseNodeTypeGuid = getCoreGuid(core, core.getBaseType(node));
                baseNodeRootGuid = getCoreGuid(core, core.getBaseRoot(node));
            }

            // set the nodes sourceGuid
            let sourceGuid: string = getCoreGuid(core, node);
            let sourceEntry: nt.Subject
                = Object.assign({},
                    nodeGuidMap.get(sourceGuid),
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
                            "name": nt.NULL_OBJECT,
                            "guid": nt.NULL_GUID
                        },
                        "attributes": {},
                        "children": {},
                        "prune": PruningFlag.None
                    });
            nodeGuidMap.set(sourceGuid, sourceEntry);

            let metaName: string;
            let metaNodeGuid: string;
            if (node === sponsor.rootNode) {
                metaName = ":Root:";
                sourceEntry.type = nt.TypeType.makeByHash({
                    "domain": nt.BLANK,
                    "name": "Root",
                    "meta": nt.NULL_GUID,
                    "root": nt.NULL_GUID,
                    "base": nt.NULL_GUID,
                    "parent": nt.NULL_GUID
                });
                metaNodeGuid = nt.NULL_GUID;
            } else if (core.isLibraryRoot(node)) {
                metaName = ":LibraryRoot:";
                metaNodeGuid = getCoreGuid(core, node);

                sponsor.logger.info(`prune: ${nodePath}`);
                pruneList.push(nodePath);
                prunedRootPath = nodePath;
            } else {
                let metaNameAttr = core.getAttribute(core.getBaseType(node), "name");
                if (typeof metaNameAttr !== "string") { return; }
                metaName = metaNameAttr;
                metaNodeGuid = getCoreGuid(core, core.getParent(node));
            }
            sourceEntry.type.parent = metaNodeGuid;
            let containRel = metaName;
            sourceEntry.prune = (prunedRootPath === null) ? PruningFlag.None : PruningFlag.Library;

            path2entry.set(nodePath, sourceEntry);

            // set the parent to know its child the root node has no parent
            // if a non-pruned item has a pruned parent then bring it in.
            if (node !== sponsor.rootNode) {
                let parent: Core.Node | null = core.getParent(node);
                if (parent === null) {
                    return;
                }
                let parentPath: string = core.getPath(parent);

                let parentData = path2entry.get(parentPath);
                if (typeof parentData === "undefined") {
                    sponsor.logger.warn(`problem with parentPath ${parentPath}`);
                    return;
                }
                let children = parentData.children;
                children[containRel] = children[containRel] || {};
                // children[containRel].push(sourceEntry);
                let reason = explainGenealogy(core, node, parent);
                if (reason === null) {
                    sponsor.logger.warn(`problem with reason`);
                }
                else {
                    children[containRel][sourceGuid] = {
                        parent: getCoreGuid(core, reason.parent),
                        child: getCoreGuid(core, reason.child)
                    };
                }
            }

            // set the nodes attributes
            core.getAttributeNames(node).forEach((attrName: string) => {
                let attrValue = core.getAttribute(node, attrName);
                if (typeof attrValue === "string") {
                    let sen = sourceEntry.name;
                    switch (attrName) {
                        case "@preserve": sen.setPropagation(attrValue); break;
                        case "@uriName": sen.uriName = attrValue; break;
                        case "@uriExt": sen.uriExt = attrValue; break;
                        case "@uriGen": sen.uriGen = attrValue; break;
                        case "@uriPrefix": sen.uriPrefix = attrValue; break;
                        case "@extguid": sen.extUuid = attrValue; break;
                        case "@extUuid": sen.extUuid = attrValue; break;
                        case "name": sen.name = attrValue; break;
                        default:
                            sourceEntry.attributes[attrName] = attrValue;
                    }
                } else if (typeof attrValue === "boolean") {
                    sourceEntry.attributes[attrName] = attrValue;
                } else if (typeof attrValue === "number") {
                    sourceEntry.attributes[attrName] = attrValue;
                } else {
                    sponsor.logger.warn(`problem with attribute ${attrName} [${typeof attrValue}] : ${attrValue}`);
                }
            });

            // get pointers & inv_pointers
            let ptrNameList: string[] = /* await */ core.getPointerNames(node);
            ptrNameList.forEach(async (ptrName, _index, _array) => {

                let targetPathRaw = pathToString(core.getPointerPath(node, ptrName));
                if (typeof targetPathRaw !== "string") { return; }

                let targetPath: string = targetPathRaw;
                let targetNode = await core.loadByPath(sponsor.rootNode, targetPath);

                let targetGuid = getCoreGuid(core, targetNode);
                if (ptrName === "base") {
                    sourceEntry.base = {
                        name: fcoName,
                        guid: targetGuid
                    };
                } else {

                    let targetMetaNode = core.getBaseType(targetNode);
                    let targetMetaName = core.getAttribute(targetMetaNode, "name");

                    let targetEntry = nodeGuidMap.get(targetGuid);
                    if (targetEntry === undefined) {
                        targetEntry = nt.Subject.makeIdentity(targetGuid);
                        nodeGuidMap.set(targetGuid, targetEntry);
                    }
                    if (typeof targetMetaName === "string") {
                        sourceEntry.pointers[ptrName] = {
                            name: targetMetaName,
                            guid: targetGuid
                        };
                        let inv = new nt.NGuidType(targetMetaName, sourceGuid);
                        if (_.isEmpty(targetEntry.inv_pointers[ptrName])) {
                            targetEntry.inv_pointers[ptrName] = [inv];
                        } else {
                            targetEntry.inv_pointers[ptrName].push(inv);
                        }
                    }
                }
            });

            // get sets & inv_set
            let setNameList: string[] = core.getValidSetNames(node);
            setNameList.forEach((setName, _index, _array) => {
                let targetMemberPathsRaw = core.getMemberPaths(node, setName);
                targetMemberPathsRaw.forEach(async (targetMemberPath) => {
                    if (typeof targetMemberPath !== "string") { return; }
                    let targetPath: string = targetMemberPath;

                    try {
                        let targetNode = await core.loadByPath(sponsor.rootNode, targetPath);

                        let targetGuid = getCoreGuid(core, targetNode);
                        let sets = sourceEntry.sets;
                        let targetMetaNode = core.getBaseType(targetNode);

                        let targetEntry = nodeGuidMap.get(targetGuid);
                        if (targetEntry === undefined) {
                            targetEntry = nt.Subject.makeIdentity(targetGuid);
                            nodeGuidMap.set(targetGuid, targetEntry);
                        }
                        let invSets = targetEntry.inv_sets;
                        let targetSet = invSets[setName];
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
                            let invLoad =
                                new nt.NGuidType(targetMetaName, sourceGuid);

                            if (targetSet === undefined) {
                                invSets[setName] = [invLoad];
                            } else {
                                targetSet.push(invLoad);
                            }
                        }
                    }
                    catch (err) {
                        sponsor.logger.error(`difficulty loading target path: ${targetPath} with err: ${err.message}`);
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
    try {
        await core.traverse(sponsor.rootNode,
            { excludeRoot: false },
            visitFn);
    } finally { }
    return nodeGuidMap;
}
