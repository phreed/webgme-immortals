/*globals define*/
/*jshint node: true, browser: true*/

/**
 * this module implements the node-by-node serialization
 * @author phreed / https://github.com/phreed
 */
import CANON = require("common/util/canon");
import Promise = require("bluebird");

interface Dictionary {
    [key: string]: string;
}

interface Abstract {
    [key: string]: Dictionary;
}

interface SheetDetail {
    registry?: any;
    attributes: any;
};

interface Sheet {
    [key: string]: SheetDetail;
}

interface Sheets {
    [key: string]: Sheet;
}

interface Containment {
    [key: string]: Containment;
}

interface NextCallback {
    (err: Error | null): void;
}

class ResultType {
    uriGen: string;
    uri: string;
    name: string;

    [propName: string]: any;
}

class JsonLibrary {
    bases: any;
    containment: Containment;
    nodes: any;
    metaSheets: any;
    relids: any;
    root: { path: string, guid: string };
};

class JsonNode {
    attributes: any;
    derivative: any;
    base: any;
    parent: any;
    pointers: any;
    sets: any;
    meta: any;
}

export class FlatSerializer {
    constructor() {
    }

    static exportLibrary(core: GmeClasses.Core, libraryRoot: any, callback: any): void {
        if (callback) {
            console.error("callback is provided");
        }
        console.error("export JSON library with NewSerializer: not implemented");
        // throw new Error("export JSON library with NewSerializer: not implemented");

        let jsonLibrary: JsonLibrary = {
            bases: {},
            containment: {},
            nodes: {},
            metaSheets: {},
            relids: {},
            root: {
                path: core.getPath(libraryRoot),
                guid: core.getGuid(libraryRoot)
            }
        };
        let guidCache: Dictionary = {};
        let pathCache: Dictionary = {};
        let root = core.getRoot(libraryRoot);
        let taskList = [core.getPath(libraryRoot)];
        let inComputation = false;
        let myTick: any;
        // necessary functions for the export method

        function isInLibrary(node: any) {
            while (node) {
                if (core.getGuid(node) === jsonLibrary.root.guid) {
                    return true;
                }
                node = core.getParent(node);
            }
            return false;
        }

        function checkForExternalBases(node: any) {
            let guid: any;
            let path: any;
            while (node) {
                guid = core.getGuid(node);
                path = core.getPath(node);
                if (!isInLibrary(node) && !jsonLibrary.bases[guid]) {
                    jsonLibrary.bases[guid] = path;
                    // Also have to put in caches as if some pointer points to these nodes,
                    // we should know about it and not handle as outgoing pointer.
                    guidCache[guid] = path;
                    pathCache[path] = guid;
                }
                node = core.getBase(node);
            }
        }

        function fillContainment(node: any) {
            // first we compute the guid chain up to the library root
            let guidChain: string[] = [];
            let actualGuid = core.getGuid(node);
            let containment = jsonLibrary.containment;
            while (actualGuid !== jsonLibrary.root.guid) {
                guidChain.unshift(actualGuid);
                node = core.getParent(node);
                actualGuid = core.getGuid(node);
            }

            // now we insert our guid into the containment tree structure
            if (guidChain.length) {
                while (guidChain.length > 1) {
                    let guid = guidChain.shift();
                    if (typeof guid === "undefined") {
                        // ASSERT(typeof containment !== 'undefined');
                        continue;
                    }
                    containment = containment[guid];
                }
                let guid = guidChain.shift();
                if (typeof guid === "string") {
                    containment[guid] = {};
                }

            }
        }

        function getAttributesOfNode(node: any) {
            let names = core.getOwnAttributeNames(node).sort();
            let result: Dictionary = {};
            for (let i = 0; i < names.length; i++) {
                let attr = core.getAttribute(node, names[i]);
                if (typeof attr === "string") {
                    result[names[i]] = attr;
                }
            }
            return result;
        }

        function buildSemanticUriForNode(node: any) {
            let uriPrefix = core.getAttribute(node, "uriPrefix"); // .trim();
            let uriExt = core.getAttribute(node, "uriExt"); // .trim();
            let uriName = core.getAttribute(node, "uriName"); // .trim();
            let name = core.getAttribute(node, "name"); // .trim();

            if (typeof uriExt === "string") {
                if (uriExt.slice(-1) !== "#") {
                    uriExt += "#";
                }
            }

            if (typeof uriName === "string") {
                if (uriName == null || uriName.length === 0) {
                    return `${uriPrefix}/${uriExt}#${name}`;
                }
            }
            return `${uriPrefix}/${uriExt}#${uriName}`;
        }

        function getDerivativeAttrOfNode(node: any) {
            let result: ResultType = new ResultType();
            let uriGen = core.getAttribute(node, "uriGen");

            if (typeof uriGen === "string") {
                result.uriGen = uriGen;
            }
            let name = core.getAttribute(node, "name");
            if (typeof name === "string") {
                result.name = name;
            }

            switch (uriGen) {
                case "semantic":
                    result.uri = buildSemanticUriForNode(node);
                    break;
                case undefined:
                case null:
                case "none":
                default:
            }
            return result;
        }

        /*
        function getRegistryOfNode(node) {
            var names = core.getOwnRegistryNames(node).sort(),
                i,
                result = {};
            for (i = 0; i < names.length; i++) {
                result[names[i]] = core.getRegistry(node, names[i]);
            }
            return result;
        }
        */

        function getPointersOfNode(node: any) {
            // this version only puts paths to target so they need to be either removed or replaced by guid targets
            // The 'base' pointer is a redundant artifact
            // and should not appear in the export file.
            let names = core.getOwnPointerNames(node).sort();
            let candidate: string;
            let result = new ResultType();
            for (let i = 0; i < names.length; i++) {
                candidate = names[i];
                if (candidate === "base") {
                    continue;
                }
                result[candidate] = core.getPointerPath(node, candidate);
            }
            return result;
        }

        function getSetsOfNode(node: any) {
            // we collect all set - but we keep only those data which were defined on this given level
            let names = core.getSetNames(node);
            let sets: Abstract = {};

            let getMemberData = (setName: string, memberPath: any) => {
                let data: any = {
                    attributes: {}
                    // , registry: {}
                };
                let names: string[];

                // attributes
                names = core.getMemberAttributeNames(node, setName, memberPath);
                for (let i = 0; i < names.length; i++) {
                    data.attributes[names[i]] = core.getMemberAttribute(node, setName, memberPath, names[i]);
                }

                // registry
                /*
                names = core.getMemberRegistryNames(node, setName, memberPath);
                for (i = 0; i < names.length; i++) {
                    data.registry[names[i]] = core.getMemberRegistry(node, setName, memberPath, names[i]);
                }
                */
                return data;
            };
            let getOwnMemberData = (setName: string, memberPath: any) => {
                let base = core.getBase(node);
                let names: string[];
                let data: any = {
                    attributes: {}
                    // , registry: {}
                };

                // no base
                if (!base) {
                    return getMemberData(setName, memberPath);
                }

                // the whole set was defined in the given level
                if (core.getSetNames(base).indexOf(setName) === -1) {
                    return getMemberData(setName, memberPath);
                }

                // the whole member was defined on the given level
                if (core.getMemberPaths(base, setName).indexOf(memberPath) === -1) {
                    return getMemberData(setName, memberPath);
                }

                // so we have the same member, let's check which 
                // values differ from the inherited ones attributes
                names = core.getMemberAttributeNames(node, setName, memberPath);
                for (let i = 0; i < names.length; i++) {
                    let value = core.getMemberAttribute(node, setName, memberPath, names[i]);
                    if (CANON.stringify(core.getMemberAttribute(base, setName, memberPath, names[i])) !==
                        CANON.stringify(value)) {

                        data.attributes[names[i]] = value;
                    }
                }

                // registry
                /*
                names = core.getMemberRegistryNames(node, setName, memberPath);
                for (i = 0; i < names.length; i++) {
                    value = core.getMemberRegistry(node, setName, memberPath, names[i]);
                    if (CANON.stringify(core.getMemberRegistry(base, setName, memberPath, names[i])) !==
                        CANON.stringify(value)) {
 
                        data.attributes[names[i]] = value;
                    }
                }
                */

                return data;

            };
            let getSetData = (setName: string) => {
                let data: Dictionary = {};
                let members = core.getMemberPaths(node, setName);

                for (let i = 0; i < members.length; i++) {
                    let member = getOwnMemberData(setName, members[i]);
                    if (Object.keys(member).length > 0) {
                        data[members[i]] = member;
                    }
                }
                return data;
            };
            for (let i = 0; i < names.length; i++) {
                let jsonSet = getSetData(names[i]);
                if (Object.keys(jsonSet).length > 0) {
                    sets[names[i]] = jsonSet;
                }
            }
            return sets;
        }

        function getNodeData(path: string, next: any) {
            let jsonNode = new JsonNode();
            let guid: string;
            inComputation = true;
            Promise
                .try(() => {
                    return core.loadByPath(root, path);
                })
                .then((node) => {
                    // fill out the basic data and make place in the jsonLibrary for the node
                    guid = core.getGuid(node);
                    // ASSERT(!jsonLibrary.nodes[guid]);

                    guidCache[guid] = path;
                    pathCache[path] = guid;
                    jsonLibrary.relids[guid] = core.getRelid(node);
                    jsonLibrary.nodes[guid] = jsonNode;

                    checkForExternalBases(node);
                    fillContainment(node);

                    /*
                     meta:pathsToGuids(JSON.parse(JSON.stringify(_core.getOwnJsonMeta(node)) || {})),
                     */

                    let nname = core.getAttribute(node, "name");
                    jsonNode.attributes = getAttributesOfNode(node);
                    jsonNode.derivative = getDerivativeAttrOfNode(node);

                    // jsonNode.registry = getRegistryOfNode(node);
                    jsonNode.base = core.getBase(node) ? core.getGuid(core.getBase(node)) : null;
                    jsonNode.parent = core.getParent(node) ? core.getGuid(core.getParent(node)) : null;
                    jsonNode.pointers = getPointersOfNode(node);
                    switch (nname) {
                        case "ROOT":
                        // jsonNode.sets = { };
                        // jsonNode.derivative.suppressed = "sets";
                        // break;
                        default:
                            jsonNode.sets = getSetsOfNode(node);
                    }
                    jsonNode.meta = core.getOwnJsonMeta(node);

                    // putting children into task list
                    taskList = taskList.concat(core.getChildrenPaths(node));

                    next(null);
                })
                .catch((err) => {
                    return next(err || new Error(`no node found at given path: ${path}`));
                });
        }

        function postProcessing() {
            let guids = Object.keys(jsonLibrary.nodes);
            jsonLibrary.metaSheets = getMetaSheetInfo(root) || {};
            for (let i = 0; i < guids.length; i++) {
                postProcessPointersOfNode(jsonLibrary.nodes[guids[i]]);
                postProcessMembersOfSets(jsonLibrary.nodes[guids[i]]);
                postProcessMetaOfNode(jsonLibrary.nodes[guids[i]]);
            }
            jsonLibrary = recursiveSort(jsonLibrary);
            callback(null, jsonLibrary);
        }

        function getMetaSheetInfo(node: any) {
            /*
            let getMemberRegistry =   (setname: string, memberpath: string) => {
                let names = core.getMemberRegistryNames(node, setname, memberpath);

                let registry: Dictionary = {};
                for (let i = 0; i < names.length; i++) {
                    registry[names[i]] = core.getMemberRegistry(node, setname, memberpath, names[i]);
                }
                return registry;
            };
            */
            let getMemberAttributes = (setname: string, memberpath: string) => {
                let names = core.getMemberAttributeNames(node, setname, memberpath);
                let attributes: Dictionary = {};
                for (let i = 0; i < names.length; i++) {
                    let attr = core.getMemberAttribute(node, setname, memberpath, names[i]);
                    if (typeof attr === "string") {
                        attributes[names[i]] = attr;
                    }
                }
                return attributes;
            };
            /*
            getRegistryEntry =   (setname) => {
                var index = registry.length;
 
                while (--index >= 0) {
                    if (registry[index].SetID === setname) {
                        return registry[index];
                    }
                }
                return {};
            },
            */
            let sheets: Sheets = {};
            // registry = core.getRegistry(node, 'MetaSheets'),
            let keys: string[] = core.getSetNames(node);
            let elements: string[];
            let guid: string;
            for (let i = 0; i < keys.length; i++) {
                if (keys[i].indexOf("MetaAspectSet") === 0) {
                    elements = core.getMemberPaths(node, keys[i]);
                    for (let j = 0; j < elements.length; j++) {
                        guid = pathCache[elements[j]];
                        if (guid) {
                            sheets[keys[i]] = sheets[keys[i]] || {};
                            let detail: SheetDetail = {
                                // registry: getMemberRegistry(keys[i], elements[j]),
                                attributes: getMemberAttributes(keys[i], elements[j])
                            };
                            let sheet = sheets[keys[i]];
                            sheet[guid] = detail;
                        }
                    }

                    /*
                    if (sheets[keys[i]] && keys[i] !== 'MetaAspectSet') {
                        //we add the global registry values as well
                        sheets[keys[i]].global = getRegistryEntry(keys[i]);
                    }
                    */
                }
            }
            return sheets;
        }

        function recursiveSort(jsonObject: any) {
            if (typeof jsonObject !== "object") {
                return jsonObject;
            }
            if (jsonObject === null) {
                return jsonObject;
            }
            if (Array.isArray(jsonObject)) {
                return jsonObject;
            }
            let ordered: Dictionary = {};
            let keys = Object.keys(jsonObject).sort();

            for (let i = 0; i < keys.length; i++) {
                ordered[keys[i]] = recursiveSort(jsonObject[keys[i]]);
            }
            return ordered;
        }

        function postProcessPointersOfNode(jsonNodeObject: any) {
            let names = Object.keys(jsonNodeObject.pointers);
            for (let i = 0; i < names.length; i++) {
                if (pathCache[jsonNodeObject.pointers[names[i]]]) {
                    jsonNodeObject.pointers[names[i]] = pathCache[jsonNodeObject.pointers[names[i]]];
                } else if (jsonNodeObject.pointers[names[i]] !== null) {
                    delete jsonNodeObject.pointers[names[i]];
                }
            }
        }

        function postProcessMembersOfSets(jsonNodeObject: any) {
            let setNames = Object.keys(jsonNodeObject.sets);

            for (let i = 0; i < setNames.length; i++) {
                let memberPaths = Object.keys(jsonNodeObject.sets[setNames[i]]);
                for (let j = 0; j < memberPaths.length; j++) {
                    if (pathCache[memberPaths[j]]) {
                        jsonNodeObject.sets[setNames[i]][pathCache[memberPaths[j]]] =
                            jsonNodeObject.sets[setNames[i]][memberPaths[j]];
                    }
                    delete jsonNodeObject.sets[setNames[i]][memberPaths[j]];
                }
            }
        }

        function postProcessMetaOfNode(jsonNodeObject: any) {
            // replacing and removing items...
            let processMetaPointer = (jsonPointerObject: any) => {
                let toRemove: number[] = [];
                for (let i = 0; i < jsonPointerObject.items.length; i++) {
                    if (pathCache[jsonPointerObject.items[i]]) {
                        jsonPointerObject.items[i] = pathCache[jsonPointerObject.items[i]];
                    } else {
                        toRemove.push(i);
                    }
                }
                while (toRemove.length > 0) {
                    let i = toRemove.pop();
                    jsonPointerObject.items.splice(i, 1);
                    jsonPointerObject.minItems.splice(i, 1);
                    jsonPointerObject.maxItems.splice(i, 1);
                }
            };

            let names = Object.keys(jsonNodeObject.meta.pointers || {}),
                processChildrenRule = (jsonChildrenObject: any) => {
                    let toRemove: number[] = [];
                    for (let i = 0; i < jsonChildrenObject.items.length; i++) {
                        if (pathCache[jsonChildrenObject.items[i]]) {
                            jsonChildrenObject.items[i] = pathCache[jsonChildrenObject.items[i]];
                        } else {
                            toRemove.push(i);
                        }
                    }

                    while (toRemove.length > 0) {
                        let i = toRemove.pop();
                        jsonChildrenObject.items.splice(i, 1);
                        jsonChildrenObject.minItems.splice(i, 1);
                        jsonChildrenObject.maxItems.splice(i, 1);
                    }
                },
                processAspectRule = (aspectElementArray: any[]) => {
                    let toRemove: any[] = [];
                    for (let i = 0; i < aspectElementArray.length; i++) {
                        if (pathCache[aspectElementArray[i]]) {
                            aspectElementArray[i] = pathCache[aspectElementArray[i]];
                        } else {
                            toRemove.push();
                        }
                    }

                    while (toRemove.length > 0) {
                        aspectElementArray.splice(toRemove.pop(), 1);
                    }
                };

            for (let i = 0; i < names.length; i++) {
                processMetaPointer(jsonNodeObject.meta.pointers[names[i]]);
            }

            processChildrenRule(jsonNodeObject.meta.children || { items: [] });

            names = Object.keys(jsonNodeObject.meta.aspects || {});
            for (let i = 0; i < names.length; i++) {
                processAspectRule(jsonNodeObject.meta.aspects[names[i]]);
            }

        }

        // here starts the actual processing
        myTick = setInterval(() => {
            if (inComputation) {
                return;
            }
            while (taskList.length > 0) {
                let task = taskList.shift();
                if (typeof task === "undefined") {
                    continue;
                }
                getNodeData(task, (err: Error) => {
                    if (err) {
                        console.log(err);
                    }
                    inComputation = false;
                });
                return;
            }
            clearInterval(myTick);
            postProcessing();
            return;
        }, 10);
    }


    static importLibrary(core: GmeClasses.Core, originalLibraryRoot: Core.Node,
        updatedJsonLibrary: any, callback: any): void {
        if (callback) {
            console.error("callback is provided");
        }
        console.error("import JSON library with NewSerializer: not implemented");

        let logTxt = "";
        let guidCache: Dictionary = {};
        let originalJsonLibrary: JsonLibrary = new JsonLibrary();

        let notInComputation: boolean;
        let root = core.getRoot(originalLibraryRoot);
        let libraryRootPath = core.getPath(originalLibraryRoot);


        let synchronizeRoots = (oldRoot: Core.Node, newGuid: string) => {
            core.setGuid(oldRoot, newGuid);
        };
        let calculateGuidCache = () => {
            let keys: string[];
            let addElement = (guid: string, path: string) => {
                if (!guidCache[guid]) {
                    guidCache[guid] = path;
                }
            };
            guidCache = {};

            // first we go with the original library
            // adding external bases
            keys = Object.keys(originalJsonLibrary.bases);
            for (let i = 0; i < keys.length; i++) {
                addElement(keys[i], originalJsonLibrary.bases[keys[i]]);
            }
            // then simple nodes
            keys = Object.keys(originalJsonLibrary.nodes);
            for (let i = 0; i < keys.length; i++) {
                addElement(keys[i], `${libraryRootPath}${getRelativePathByGuid(keys[i], originalJsonLibrary)}`);
            }
            // then the updated one
            // adding external bases
            keys = Object.keys(updatedJsonLibrary.bases);
            for (let i = 0; i < keys.length; i++) {
                addElement(keys[i], updatedJsonLibrary.bases[keys[i]]);
            }
            // then simple nodes
            keys = Object.keys(updatedJsonLibrary.nodes);
            for (let i = 0; i < keys.length; i++) {
                addElement(keys[i], `${libraryRootPath}${getRelativePathByGuid(keys[i], updatedJsonLibrary)}`);
            }
        };
        let insertEmptyNode = (guid: string, next: any) => {
            // log(`node ${logId(guid, updatedJsonLibrary)} will be added as an empty object`);
            // first we collect all creation related data
            let relid = updatedJsonLibrary.relids[guid];
            let parentPath = guidCache[updatedJsonLibrary.nodes[guid].parent];
            let basePath = guidCache[updatedJsonLibrary.nodes[guid].base];
            let needed = 2;
            let parent: Core.Node | null = null;
            let base: Core.Node | null = null;
            let error: Error | null = null;
            let create = () => {
                if (error) {
                    return next(error);
                }
                core.createNode({ base: base, parent: parent, relid: relid, guid: guid });
                next(null);
            };
            // then we load the base and the parent of the node
            core.loadByPath(root, parentPath, (err: Error, n: Core.Node) => {
                error = error || err;
                parent = n;
                if (--needed === 0) {
                    create();
                }
            });
            if (typeof basePath === "string") {
                core.loadByPath(root, basePath, (err, n) => {
                    error = error || err;
                    base = n;
                    if (--needed === 0) {
                        create();
                    }
                });
            } else {
                if (--needed === 0) {
                    create();
                }
            }

        };
        let moveNode = (guid: string, next: NextCallback) => {
            // we need the node itself and the new parent
            log(`node ${logId(guid, updatedJsonLibrary)} will be moved within the library from ${getRelativePathByGuid(guid, originalJsonLibrary)} to ${getRelativePathByGuid(guid, updatedJsonLibrary)}`);

            let node: Core.Node;
            let parent: Core.Node;
            let needed = 2;
            let error: Error | null = null;
            let move = () => {
                if (error) {
                    return next(error);
                }
                core.moveNode(node, parent);
                guidCache[guid] = core.getPath(node);
                next(null);
            };

            Promise
                .try(() => {
                    return core.loadByPath(root, guidCache[guid]);
                })
                .then((n) => {
                    parent = n;
                    if (--needed === 0) {
                        move();
                    }
                })
                .catch((err) => {
                    error = error || err;
                    // parent = null;
                    if (--needed === 0) {
                        move();
                    }
                });
            Promise
                .try(() => {
                    return core.loadByPath(root, guidCache[updatedJsonLibrary.nodes[guid].parent]);
                })
                .then((n) => {
                    parent = n;
                    if (--needed === 0) {
                        move();
                    }
                })
                .catch((err) => {
                    error = error || err;
                    // parent = null;
                    if (--needed === 0) {
                        move();
                    }
                });
        };
        let updateNode = (guid: string, next: NextCallback) => {
            // TODO implement
            let updateAttributes = () => {
                let oAttributes = originalJsonNode.attributes || {};
                let uAttributes = updatedJsonNode.attributes || {};

                let keys = Object.keys(oAttributes);
                // removing attributes
                for (let i = 0; i < keys.length; i++) {
                    if (!uAttributes[keys[i]]) {
                        log(`node ${logId(guid, updatedJsonLibrary)} will lose it\'s attribute [${keys[i]}]`);

                        core.delAttribute(node, keys[i]);
                    }
                }
                // adding or updating attributes
                keys = Object.keys(uAttributes);
                for (let i = 0; i < keys.length; i++) {
                    if (!oAttributes[keys[i]]) {
                        log(`node ${logId(guid, updatedJsonLibrary)} will get a new attribute [${keys[i]}]`);
                        core.setAttribute(node, keys[i], uAttributes[keys[i]]);
                    } else if (CANON.stringify(oAttributes[keys[i]] !==
                        CANON.stringify(uAttributes[keys[i]]))) {

                        log(`node ${logId(guid, updatedJsonLibrary)} will update the value of attribute [${keys[i]}]`);

                        core.setAttribute(node, keys[i], uAttributes[keys[i]]);
                    }
                }
            };
            let updateRegistry = () => {
                let oRegistry = originalJsonNode.registry || {};
                let uREgistry = updatedJsonNode.registry || {};

                let okeys = Object.keys(oRegistry);
                // removing registry entries
                for (let i = 0; i < okeys.length; i++) {
                    if (!uREgistry[okeys[i]]) {
                        log(`node ${logId(guid, updatedJsonLibrary)} will lose it\'s registry item [${okeys[i]}]`);

                        core.delRegistry(node, okeys[i]);
                    }
                }
                // adding or updating attributes
                let ukeys = Object.keys(uREgistry);
                for (let i = 0; i < ukeys.length; i++) {
                    if (!oRegistry[ukeys[i]]) {
                        log(`node ${logId(guid, updatedJsonLibrary)} will get a new registry item [${ukeys[i]}]`);
                        core.setRegistry(node, ukeys[i], uREgistry[ukeys[i]]);
                    } else if (CANON.stringify(oRegistry[ukeys[i]] !== CANON.stringify(uREgistry[ukeys[i]]))) {
                        log(`node ${logId(guid, updatedJsonLibrary)} will update the value of registry item [${ukeys[i]}]`);
                        core.setRegistry(node, ukeys[i], uREgistry[ukeys[i]]);
                    }
                }
            };
            let updatePointers = (pNext: NextCallback) => {
                let updatePointer = (name: string, cb: NextCallback) => {
                    if (updatedJsonNode.pointers[name] === null) {
                        core.setPointer(node, name, null);
                        return cb(null);
                    }
                    core.loadByPath(root, guidCache[updatedJsonNode.pointers[name]],
                        (err, target) => {
                            if (err) {
                                return cb(err);
                            }
                            core.setPointer(node, name, target);
                            cb(null);
                        }
                    );
                };
                let updating = false;
                let setList: string[] = [];
                let error: Error | null = null;

                let oPointers = Object.keys(originalJsonNode.pointers || {});
                let uPointers = Object.keys(updatedJsonNode.pointers || {});

                // first removing pointers
                for (let i = 0; i < oPointers.length; i++) {
                    if (uPointers.indexOf(oPointers[i]) === -1) {
                        log(`node ${logId(guid, updatedJsonLibrary)} will lose it\'s pointer [${oPointers[i]}]`);
                        core.deletePointer(node, oPointers[i]);
                    }
                }

                // creating list for inserting or updating pointers
                for (let i = 0; i < uPointers.length; i++) {
                    if (oPointers.indexOf(uPointers[i]) === -1) {
                        log(`node ${logId(guid, updatedJsonLibrary)} will have a new pointer [${uPointers[i]}]`);
                        setList.push(uPointers[i]);
                    } else if (originalJsonNode.pointers[uPointers[i]] !==
                        updatedJsonNode.pointers[uPointers[i]]) {

                        log(`node ${logId(guid, updatedJsonLibrary)} will have a new target for pointer [${uPointers[i]}]`);
                        setList.push(uPointers[i]);
                    }
                }

                // start the ticking if needed
                if (setList.length === 0) {
                    return pNext(null);
                }
                let tick = setInterval(() => {
                    if (!updating) {
                        if (setList.length > 0) {
                            updating = true;
                            let set = setList.shift();
                            if (typeof set === "string") {
                                updatePointer(set, (err: Error) => {
                                    error = error || err;
                                    updating = false;
                                });
                            }
                        } else {
                            clearInterval(tick);
                            pNext(error);
                        }
                    }
                }, 10);
            };
            let updateSets = (sNext: NextCallback) => {
                let updateSet = (name: string, finished: any) => {
                    let oMembers = Object.keys(originalJsonNode.sets[name] || {});
                    let uMembers = Object.keys(updatedJsonNode.sets[name] || {});
                    let toCreate: string[] = [];
                    let error: Error | null = null;

                    let creating = false;

                    // removing members
                    for (let i = 0; i < oMembers.length; i++) {
                        if (uMembers.indexOf(oMembers[i]) === -1) {
                            log(`node ${logId(guid, updatedJsonLibrary)} `
                                + `will clear member [${oMembers[i]}] from set [${name}]`);
                            core.delMember(node, name, guidCache[oMembers[i]]);
                        }
                    }

                    // updating members and filling create list
                    for (let i = 0; i < uMembers.length; i++) {
                        if (oMembers.indexOf(uMembers[i]) === -1) {
                            toCreate.push(uMembers[i]);
                            log(`node ${logId(guid, updatedJsonLibrary)} `
                                + `will add member [${uMembers[i]}] to it\'s set [${name}]`);
                        } else if (CANON.stringify(originalJsonNode.sets[name][uMembers[i]]) !==
                            CANON.stringify(updatedJsonNode.sets[name][uMembers[i]])) {

                            log(`node ${logId(guid, updatedJsonLibrary)} `
                                + `will update member [${uMembers[i]}] in set [${name}]`);

                            updateMember(name, uMembers[i]);
                        }
                    }

                    // check if we have to start ticking
                    if (toCreate.length === 0) {
                        return finished(null);
                    }

                    tick = setInterval(() => {
                        if (!creating) {
                            if (toCreate.length > 0) {
                                creating = true;
                                let create = toCreate.shift();
                                if (typeof create === "string") {
                                    addMember(name, create, (err: Error) => {
                                        error = error || err;
                                        creating = false;
                                    });
                                }
                            } else {
                                clearInterval(tick);
                                return finished(error);
                            }
                        }
                    }, 10);
                };
                let addMember = (setName: string, guid: string, mNext: NextCallback) => {
                    core.loadByPath(root, guidCache[guid], (err: Error, member: Core.Node) => {

                        if (err) {
                            return mNext(err);
                        }
                        core.addMember(node, setName, member);
                        let akeys = Object.keys(updatedJsonNode.sets[setName][guid].attributes || {});
                        for (let i = 0; i < akeys.length; i++) {
                            core.setMemberAttribute(node, setName, guidCache[guid], akeys[i],
                                updatedJsonNode.sets[setName][guid].attributes[akeys[i]]);
                        }
                        let ukeys = Object.keys(updatedJsonNode.sets[setName][guid].registry || {});
                        for (let i = 0; i < ukeys.length; i++) {
                            core.setMemberRegistry(node, setName, guidCache[guid], ukeys[i],
                                updatedJsonNode.sets[setName][guid].registry[ukeys[i]]);
                        }
                        return mNext(null);
                    });
                };
                let updateMember = (setName: string, guid: string) => {
                    let oMember = originalJsonNode.sets[setName][guid] || {};
                    let uMember = updatedJsonNode.sets[setName][guid] || {};

                    // attributes
                    // deleting
                    let okeys = Object.keys(oMember.attributes || {});
                    for (let i = 0; i < okeys.length; i++) {
                        if (!uMember.attributes || uMember.attributes[okeys[i]] === undefined) {
                            core.delMemberAttribute(node, setName, guidCache[guid], okeys[i]);
                        }
                    }
                    // adding and updating
                    let ukeys = Object.keys(uMember.attributes || {});
                    for (let i = 0; i < ukeys.length; i++) {
                        if (!oMember.attributes
                            || oMember.attributes[ukeys[i]] === undefined
                            || CANON.stringify(oMember.attributes[ukeys[i]]) !==
                            CANON.stringify(uMember.attributes[ukeys[i]])) {

                            core.setMemberAttribute(node, setName, guidCache[guid],
                                uMember.attributes[ukeys[i]]);
                        }
                    }

                    // registry
                    // deleting
                    let orkeys = Object.keys(oMember.registry || {});
                    for (let i = 0; i < orkeys.length; i++) {
                        if (!uMember.registry || uMember.registry[orkeys[i]] === undefined) {
                            core.delMemberRegistry(node, setName, guidCache[guid], orkeys[i]);
                        }
                    }
                    // adding and updating
                    let urkeys = Object.keys(uMember.registry || {});
                    for (let i = 0; i < urkeys.length; i++) {
                        if (!oMember.registry
                            || oMember.registry[urkeys[i]] === undefined
                            || CANON.stringify(oMember.registry[urkeys[i]]) !==
                            CANON.stringify(uMember.registry[urkeys[i]])) {

                            core.setMemberRegistry(node, setName, guidCache[guid],
                                uMember.registry[urkeys[i]]);
                        }
                    }
                };

                let oSets = Object.keys(originalJsonNode.sets || {});
                let uSets = Object.keys(updatedJsonNode.sets || {});

                let updating = false;
                let toUpdate: string[] = [];
                let error: Error | null = null;
                // first we simply remove the whole set if we have to
                for (let i = 0; i < oSets.length; i++) {
                    if (uSets.indexOf(oSets[i]) === -1) {
                        log(`node ${logId(guid, updatedJsonLibrary)} will lose it\'s set [${oSets[i]}]`);
                        core.deleteSet(node, oSets[i]);
                    }
                }
                // collecting sets that needs to be updated or created
                for (let i = 0; i < uSets.length; i++) {
                    if (oSets.indexOf(uSets[i]) === -1) {
                        toUpdate.push(uSets[i]);
                    } else if (CANON.stringify(originalJsonNode.sets[uSets[i]]) !==
                        CANON.stringify(updatedJsonNode.sets[uSets[i]])) {
                        toUpdate.push(uSets[i]);
                    }
                }

                if (toUpdate.length === 0) {
                    return sNext(null);
                }

                // start ticking
                let tick = setInterval(() => {
                    if (!updating) {
                        if (toUpdate.length > 0) {
                            updating = true;
                            let update = toUpdate.shift();
                            if (typeof update === "string") {
                                updateSet(update, (err: Error) => {
                                    error = error || err;
                                    updating = false;
                                });
                            }
                        } else {
                            clearInterval(tick);
                            sNext(error);
                        }
                    }
                }, 10);
            };
            let updateMeta = (mNext: NextCallback) => {


                // TODO check if some real delta kind of solutions is possible for meta rule definition
                let meta = updatedJsonNode.meta || {};
                let addGuidTarget = (guid: string, finish: NextCallback) => {

                    core.loadByPath(root, guidCache[guid], (err: Error, target: Core.Node) => {
                        if (err) {
                            return finish(err);
                        }
                        // search it among children
                        if (meta.children && meta.children.items && meta.children.items.length) {
                            let i = meta.children.items.indexOf(guid);
                            if (i !== -1) {
                                core.setChildMeta(node, target, meta.children.minItems[i] || -1,
                                    meta.children.maxItems[i] || -1);
                            }
                        }

                        // now a similar search for every pointer
                        let pkeys = Object.keys(meta.pointers || {});
                        for (let i = 0; i < pkeys.length; i++) {
                            if (meta.pointers[pkeys[i]] && meta.pointers[pkeys[i]].items &&
                                meta.pointers[pkeys[i]].items.length) {

                                let index = meta.pointers[pkeys[i]].items.indexOf(guid);
                                if (index !== -1) {
                                    core.setPointerMetaTarget(node, pkeys[i], target,
                                        meta.pointers[pkeys[i]].minItems[index] || -1,
                                        meta.pointers[pkeys[i]].maxItems[index] || -1);
                                }
                            }
                        }

                        // finally some check for aspects
                        let aspkeys = Object.keys(meta.aspects || {});
                        for (let i = 0; i < aspkeys.length; i++) {
                            if (meta.aspects[aspkeys[i]].length) {
                                if (meta.aspects[aspkeys[i]].indexOf(guid) !== -1) {
                                    core.setAspectMetaTarget(node, aspkeys[i], target);
                                }
                            }
                        }
                        finish(null);
                    });
                };
                let addGuid = (guid: string) => {
                    let targetToAdd: string[] = [];
                    if (targetToAdd.indexOf(guid) === -1) {
                        targetToAdd.push(guid);
                    }
                    let updating = false;
                    let error: Error | null = null;
                    core.clearMetaRules(node);

                    // attributes
                    let akeys = Object.keys(meta.attributes || {});
                    for (let i = 0; i < akeys.length; i++) {
                        core.setAttributeMeta(node, akeys[i], meta.attributes[akeys[i]]);
                    }

                    // collecting all targets
                    if (meta.children && meta.children.items && meta.children.items.length) {
                        for (let i = 0; i < meta.children.items.length; i++) {
                            addGuid(meta.children.items[i]);
                        }
                    }
                    let pkeys = Object.keys(meta.pointers || {});
                    for (let i = 0; i < pkeys.length; i++) {
                        if (meta.pointers[pkeys[i]].items && meta.pointers[pkeys[i]].items.length) {
                            for (let j = 0; j < meta.pointers[pkeys[i]].items.length; j++) {
                                addGuid(meta.pointers[pkeys[i]].items[j]);
                            }
                        }
                        if (meta.pointers[pkeys[i]].min || meta.pointers[pkeys[i]].max) {
                            core.setPointerMetaLimits(node, pkeys[i],
                                meta.pointers[pkeys[i]].min || -1,
                                meta.pointers[pkeys[i]].max || -1);
                        }
                    }
                    let aspkeys = Object.keys(meta.aspects || {});
                    for (let i = 0; i < aspkeys.length; i++) {
                        if (meta.aspects[aspkeys[i]] && meta.aspects[aspkeys[i]].length) {
                            for (let j = 0; j < meta.aspects[aspkeys[i]].length; j++) {
                                addGuid(meta.aspects[aspkeys[i]][j]);
                            }
                        }
                    }
                    // setting global maximums and minimums
                    if (meta.children && (meta.children.max || meta.children.min)) {
                        core.setChildrenMetaLimits(node,
                            meta.children.min || -1,
                            meta.children.max || -1);
                    }

                    if (targetToAdd.length === 0) {
                        return mNext(error);
                    }

                    // start ticking
                    let tick = setInterval(() => {
                        if (!updating) {
                            if (targetToAdd.length > 0) {
                                updating = true;
                                let target = targetToAdd.shift();
                                if (typeof target === "string") {
                                    addGuidTarget(target, (err: Error) => {
                                        error = error || err;
                                        updating = false;
                                    });
                                }
                            } else {
                                clearInterval(tick);
                                mNext(error);
                            }
                        }
                    }, 10);
                };
            };
            let loadNode = () => {
                let needed = 3;
                let error: Error | null = null;
                core.loadByPath(root, guidCache[guid], (err, n) => {
                    if (err) {
                        return next(err);
                    }
                    node = n;

                    // now we will do the immediate changes, then the ones which probably needs loading
                    updateAttributes();
                    updateRegistry();
                    if (CANON.stringify(originalJsonNode.pointers) !==
                        CANON.stringify(updatedJsonNode.pointers)) {

                        updatePointers((err) => {
                            error = error || err;
                            if (--needed === 0) {
                                return next(error);
                            }
                        });
                    } else if (--needed === 0) {
                        return next(error);
                    }
                    if (CANON.stringify(originalJsonNode.sets) !== CANON.stringify(updatedJsonNode.sets)) {
                        updateSets((err) => {
                            error = error || err;
                            if (--needed === 0) {
                                return next(error);
                            }
                        });
                    } else if (--needed === 0) {
                        return next(error);
                    }
                    if (CANON.stringify(originalJsonNode.meta) !== CANON.stringify(updatedJsonNode.meta)) {
                        updateMeta((err) => {
                            error = error || err;
                            if (--needed === 0) {
                                return next(error);
                            }
                        });
                    } else if (--needed === 0) {
                        return next(error);
                    }
                });
            };

            let node: Core.Node;
            let originalJsonNode: any;
            let updatedJsonNode = updatedJsonLibrary.nodes[guid];

            if (originalJsonLibrary.nodes[guid] && CANON.stringify(originalJsonLibrary.nodes[guid]) !==
                CANON.stringify(updatedJsonNode)) {

                // there is some change
                originalJsonNode = originalJsonLibrary.nodes[guid];
                log(`node ${logId(guid, updatedJsonLibrary)} will be updated`);
                loadNode();
            } else if (!originalJsonLibrary.nodes[guid]) {
                // new node
                originalJsonNode = {
                    base: null,
                    parent: null,
                    meta: {},
                    attributes: {},
                    // registry: {},
                    pointers: {},
                    sets: {}
                };
                log(`node ${logId(guid, updatedJsonLibrary)} will be filled with data`);
                loadNode();
            } else {
                // no need for update
                next(null);
            }
        };
        let removeNode = (guid: string, next: NextCallback) => {
            log(`node ${logId(guid, originalJsonLibrary)} will be removed - which will cause also the removal of all of its descendant and children`);
            core.loadByPath(root, guidCache[guid], (err, node) => {
                if (err) {
                    return next(err);
                }
                core.deleteNode(node);
                next(null);
            });
        };
        let postProcessing = () => {
            // TODO collect what task we should do as a post processing task - like perist?
            callback(null, logTxt);
        };
        let getRelativePathByGuid = (guid: string, library: JsonLibrary) => {
            let path = "";
            while (guid !== library.root.guid) {
                path = `/${library.relids[guid]}${path}`;
                guid = library.nodes[guid].parent;
            }
            return path;
        };
        let prepareForAddingNodes = () => {
            // we fill up some global variables and fill out the task list
            let oldGuids = Object.keys(originalJsonLibrary.nodes);
            let newGuids = Object.keys(updatedJsonLibrary.nodes);

            let taskList: string[] = [];
            for (let i = 0; i < newGuids.length; i++) {
                if (oldGuids.indexOf(newGuids[i]) === -1) {
                    taskList.push(newGuids[i]);
                }
            }

            // If some base or parent of a new node comes after it in our list we have to bring
            // those before this node.
            let i = 0;
            while (i < taskList.length) {
                let index = taskList.indexOf(updatedJsonLibrary.nodes[taskList[i]].parent);
                if (index !== -1 && index > i) {
                    let guid = taskList[index];
                    taskList.splice(index, 1);
                    taskList.splice(i, 0, guid);
                } else {
                    index = taskList.indexOf(updatedJsonLibrary.nodes[taskList[i]].base);
                    if (index !== -1 && index > i) {
                        let guid = taskList[index];
                        taskList.splice(index, 1);
                        taskList.splice(i, 0, guid);
                    } else {
                        // no obstacle before the node so we can go on
                        i++;
                    }
                }
            }
        };
        let prepareForMoveNodes = () => {
            // we fill up some global variables and fill out the task list
            let oldGuids = Object.keys(originalJsonLibrary.nodes);
            let newGuids = Object.keys(updatedJsonLibrary.nodes);


            let taskList: string[] = [];
            for (let i = 0; i < newGuids.length; i++) {
                if (oldGuids.indexOf(newGuids[i]) !== -1) {
                    taskList.push(newGuids[i]);
                }
            }
            let i = taskList.length - 1;
            while (i >= 0) {
                if (getRelativePathByGuid(taskList[i], originalJsonLibrary) ===
                    getRelativePathByGuid(taskList[i], updatedJsonLibrary)) {

                    taskList.splice(i, 1);
                }
                i--;
            }
        };

        let prepareForUpdateNodes = () => {
            // we fill up some global variables and fill out the task list
            // here we simply add the root to the tasklist as each update will insert the actual node's children
            let taskList: string[] = [updatedJsonLibrary.root.guid];

            let addChildren = (containment: Containment) => {
                let children = Object.keys(containment);
                for (let i = 0; i < children.length; i++) {
                    taskList.push(children[i]);
                    addChildren(containment[children[i]]);
                }
            };

            addChildren(updatedJsonLibrary.containment);
        };
        let prepareForDeleteNodes = () => {
            // we fill up some global variables and fill out the task list
            let oldGuids = Object.keys(originalJsonLibrary.nodes);
            let newGuids = Object.keys(updatedJsonLibrary.nodes);

            let taskList: string[] = [];
            for (let i = 0; i < oldGuids.length; i++) {
                if (newGuids.indexOf(oldGuids[i]) === -1) {
                    taskList.push(oldGuids[i]);
                }
            }

            // if some of the nodes has its parent or base before itself we remove it from the tasklist
            let i = taskList.length - 1;
            while (i >= 0) {
                let index = taskList.indexOf(originalJsonLibrary.nodes[taskList[i]].parent);
                if (index !== -1 && index < i) {
                    taskList.splice(i, 1);
                } else {
                    index = taskList.indexOf(originalJsonLibrary.nodes[taskList[i]].base);
                    if (index !== -1 && index < i) {
                        taskList.splice(i, 1);
                    }
                }
                i--;
            }
        };
        let logId = (guid: string, library: JsonLibrary) => {
            let txtId = `${guid}`;
            if (library.nodes[guid] && library.nodes[guid].attributes && library.nodes[guid].attributes.name) {
                txtId = `${library.nodes[guid].attributes.name}(${guid})`;
            }
            return txtId;
        };
        let log = (txt: string) => {
            logTxt += `${txt}\n`;
        };
        let phase = "addnodes";

        synchronizeRoots(originalLibraryRoot, updatedJsonLibrary.root.guid);

        FlatSerializer.exportLibrary(core, originalLibraryRoot, (err: Error, jsonLibrary: JsonLibrary) => {
            if (err) {
                return callback(err);
            }

            // here starts the actual processing
            originalJsonLibrary = jsonLibrary;
            calculateGuidCache();
            prepareForAddingNodes();
            notInComputation = true;

            let taskList: string[] = [];
            // first we add the new nodes
            let myTick = setInterval(() => {
                if (notInComputation) {
                    switch (phase) {
                        case "addnodes":
                            if (taskList.length > 0) {
                                notInComputation = false;
                                let task = taskList.shift();
                                if (typeof task === "string") {
                                    insertEmptyNode(task, (err: Error) => {
                                        if (err) {
                                            console.log(err);
                                        }
                                        notInComputation = true;
                                    });
                                }
                            } else {
                                prepareForMoveNodes();
                                phase = "movenodes";
                            }
                            break;
                        case "movenodes":
                            if (taskList.length > 0) {
                                notInComputation = false;
                                let task = taskList.shift();
                                if (typeof task === "string") {
                                    moveNode(task, (err) => {
                                        if (err) {
                                            console.log(err);
                                        }
                                        notInComputation = true;
                                    });
                                }
                            } else {
                                prepareForUpdateNodes();
                                phase = "updatenodes";
                            }
                            break;
                        case "updatenodes":
                            if (taskList.length > 0) {
                                notInComputation = false;
                                let task = taskList.shift();
                                if (typeof task === "string") {
                                    updateNode(task, (err: Error) => {
                                        if (err) {
                                            console.log(err);
                                        }
                                        notInComputation = true;
                                    });
                                }
                            } else {
                                prepareForDeleteNodes();
                                phase = "removenodes";
                            }
                            break;
                        default:
                            if (taskList.length > 0) {
                                notInComputation = false;
                                let task = taskList.shift();
                                if (typeof task === "string") {
                                    removeNode(task, (err: Error) => {
                                        if (err) {
                                            console.log(err);
                                        }
                                        notInComputation = true;
                                    });
                                }
                            } else {
                                clearInterval(myTick);
                                postProcessing();
                            }
                    }
                }
            }, 10);
        });
    };
}

