/*globals define*/
/*jshint node: true, browser: true*/

/**
 * this module implements the node-by-node serialization
 * @author phreed
 */
// import CANON = require("common/util/canon");
import ASSERT = require("common/util/assert");

interface NextCallback {
  (err: Error | null): void;
}

interface Dictionary {
  [key: string]: string;
}

interface Containment {
  [key: string]: Containment;
}
/*
interface DataProps {
  attributes: Dictionary;
  registry: Dictionary;
}
*/
/*
interface Sheet {
  [key: string]: DataProps;
  global?: any;
}
*/
/*
interface Sheets {
  [key: string]: Sheet;
}
*/
/*
interface JsonObject {
  items: string[];
  minItems: number[];
  maxItems: number[];
}
*/


export interface JsonModel {
  format_version: string;
  generated_by: string;
  target_cytoscapejs_version: string;
  data: {
    shared_name: string;
    name: string;
    __Annotations: any[];
    selected: boolean
  };
  elements: {
    nodes: any[];
    edges: any[];
  };
  root?: any;
  bases?: any;
  containment?: any;
}

export class CyjsSerializer {
  constructor() {
  }

static exportMegaModelAsync(core: GmeClasses.Core, libraryRoot: any): Promise<JsonModel> {
   return new Promise<JsonModel>((resolve, _reject) => {
            CyjsSerializer.exportMegaModel(core, libraryRoot, resolve);
        });
}
  // export-global variables and their initialization
  static exportMegaModel(core: GmeClasses.Core, libraryRoot: any, callback: any): void {

    let jsonModel: JsonModel = {
      format_version: "1.0",
      generated_by: "immortals-0.1.0",
      target_cytoscapejs_version: "~2.1",
      data: {
        shared_name: "immortals.sif",
        name: "immortals.sif",
        __Annotations: [],
        selected: true
      },
      elements: {
        nodes: [
          /**
          {data: {<attributes>}}
          */
        ],
        edges: [
          /**
          {data: {<attributes>}}
          */
        ]
      }
    };
    let guidCache: Dictionary = {};
    let pathCache: Dictionary = {};
    let nodeCache: { [key: string]: Core.Node } = {};
    let root = core.getRoot(libraryRoot);
    let taskList = [core.getPath(libraryRoot)];
    let notInComputation = true;
    let myTick: any;
    // necessary functions for the export method

    /*
    function isInLibrary(node: Core.Node): boolean {
      while (node) {
        if (core.getGuid(node) === jsonModel.root.guid) {
          return true;
        }
        node = core.getParent(node);
      }
      return false;
    }
    */

    /*
    function checkForExternalBases(node: Core.Node): void {
      let guid: string;
      let path: string;
      while (node) {
        guid = core.getGuid(node);
        path = core.getPath(node);
        if (!isInLibrary(node) && !jsonModel.bases[guid]) {
          jsonModel.bases[guid] = path;
          // Also have to put in caches as if some pointer points to these nodes,
          // we should know about it and not handle as outgoing pointer.
          guidCache[guid] = path;
          pathCache[path] = guid;
        }
        node = core.getBase(node);
      }
    }
    */

    /*
    function fillContainment(node: Core.Node): void {
      // first we compute the guid chain up to the library root
      let guidChain: string[] = [];
      let actualGuid: string = core.getGuid(node);
      let containment: Containment = jsonModel.containment;
      while (actualGuid !== jsonModel.root.guid) {
        guidChain.unshift(actualGuid);
        node = core.getParent(node);
        actualGuid = core.getGuid(node);
      }

      // now we insert our guid into the containment tree structure
      if (guidChain.length) {
        while (guidChain.length > 1) {
          let guid = guidChain.shift();
          if (typeof guid === "string") {
            containment = containment[guid];
            ASSERT(typeof containment !== "undefined");
          }
        }
        let guid = guidChain.shift();
        if (typeof guid === "string") {
          containment[guid] = {};
        }
      }
    }
    */

    function getAttributesOfNode(node: Core.Node): Dictionary {
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

    /*
    function getRegistryOfNode(node: Core.Node): Dictionary {
      let names = core.getOwnRegistryNames(node).sort();
      let result: Dictionary = {};
      for (let i = 0; i < names.length; i++) {
        let reg = core.getRegistry(node, names[i]);
        if (typeof reg === "string") {
          result[names[i]] = reg;
        }
      }
      return result;
    }
    */

    function getPointersOfNode(node: Core.Node): Dictionary {
      // this version only puts paths to target so they need to be either removed or replaced by guid targets
      // The 'base' pointer is a redundant artifact
      // and should not appear in the export file.
      let names = core.getOwnPointerNames(node).sort();
      let result: Dictionary = {};
      for (let i = 0; i < names.length; i++) {
        let candidate = names[i];
        if (candidate === "base") { continue; }
        let path = core.getPointerPath(node, candidate);
        if (typeof path === "string") {
          result[candidate] = path;
        }
      }
      return result;
    }

    /*
    function getSetsOfNode(node: Core.Node): any {
      // we collect all set - but we keep only those data which were defined on this given level
      let names = core.getSetNames(node);
      let sets: { [key: string]: { [key: string]: DataProps } } = {};

      let getMemberData =   (setName: string, memberPath: string) => {
        let data: DataProps = {
          attributes: {},
          registry: {}
        };
        // attributes
        let names = core.getMemberAttributeNames(node, setName, memberPath);
        for (let i = 0; i < names.length; i++) {
          let attr = core.getMemberAttribute(node, setName, memberPath, names[i]);
          if (typeof attr === "string") {
            data.attributes[names[i]] = attr;
          }
        }

        // registry
        names = core.getMemberRegistryNames(node, setName, memberPath);
        for (let i = 0; i < names.length; i++) {
          let reg = core.getMemberRegistry(node, setName, memberPath, names[i]);
          if (typeof reg === "string") {
            data.registry[names[i]] = reg;
          }
        }
        return data;
      };

      let getOwnMemberData =   (setName: string, memberPath: string): DataProps => {
        let base = core.getBase(node);

        let data: DataProps = {
          attributes: {},
          registry: {}
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
        // values differ from the inherited one attributes
        let anames = core.getMemberAttributeNames(node, setName, memberPath);
        for (let i = 0; i < anames.length; i++) {
          let name = anames[i];
          let value = core.getMemberAttribute(node, setName, memberPath, name);
          if (CANON.stringify(core.getMemberAttribute(base, setName, memberPath, name)) !==
            CANON.stringify(value)) {
            if (typeof value === "string") {
              data.attributes[name] = value;
            }
          }
        }

        // registry
        let rnames = core.getMemberRegistryNames(node, setName, memberPath);
        for (let i = 0; i < names.length; i++) {
          let name = rnames[i];
          let value = core.getMemberRegistry(node, setName, memberPath, name);
          if (CANON.stringify(core.getMemberRegistry(base, setName, memberPath, name)) !==
            CANON.stringify(value)) {
            if (typeof value === "string") {
              data.attributes[name] = value;
            }
          }
        }

        return data;

      };
      let getSetData =   (setName: string) => {
        let data: { [key: string]: DataProps } = {};
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
        let name = names[i];
        let jsonSet = getSetData(name);
        if (Object.keys(jsonSet).length > 0) {
          sets[name] = jsonSet;
        }
      }
      return sets;
    }
    */

    function getNodeData(path: string, next: NextCallback) {
      let jnode = new Core.Node;
      // let notInComputation = false;

      core.loadByPath(root, path, (err, node) => {
        if (err || !node) {
          return next(err || new Error(`no node found at given path: ${path}`));
        }

        // fill out the basic data and make place in the jsonModel for the node
        let guid = core.getGuid(node);
        ASSERT(!nodeCache[guid]);

        guidCache[guid] = path;
        pathCache[path] = guid;
        nodeCache[guid] = jnode;
        jsonModel.elements.nodes.push({
          data: jnode
        });

        let attributes = getAttributesOfNode(node);
        jnode._id = guid;
        for (let pname in attributes) {
          (<any>jnode)[pname] = attributes[pname];
        }

        // jsonNode.registry = getRegistryOfNode(node);
        if (core.getBase(node)) {
          jsonModel.elements.edges.push({
            data: {
              type: "is-based-on",
              source: guid,
              target: core.getGuid(core.getBase(node)),
            }
          });
        }

        if (core.getParent(node)) {
          jsonModel.elements.edges.push({
            data: {
              type: "is-contained-in",
              source: guid,
              target: core.getGuid(core.getParent(node))
            }
          });
        }

        let pointers = getPointersOfNode(node);
        for (let ptrKey in pointers) {
          let ptr = pointers[ptrKey];
          if (!ptr) {
            console.log(`null target path : ${ptrKey}`);
          } else {
            jsonModel.elements.edges.push({
              data: {
                source: guid,
                target: ptr,
                type: "points-to",
                pname: ptrKey
              }
            });
          }
        }
        // var sets = getSetsOfNode(node);
        // var meta = core.getOwnJsonMeta(node);

        // putting children into task list
        taskList = taskList.concat(core.getChildrenPaths(node));

        next(null);
      });
    }

    function postProcessing() {
      // let guids = Object.keys(jsonModel.elements.edges);
      jsonModel.elements.edges.forEach((edge) => {
        switch (edge.data.type) {
          case "points-to":
            postProcessPointerTargetEdge(edge);
            break;
          case "is-contained-in":
          case "is-based-on":
            // good pointers than need no repair
            break;
          default:
            console.log(`unknown pointer type : ${edge.data.type}`);
        }
        // postProcessMembersOfSets(jsonModel.nodes[guids[i]]);
        // postProcessMetaOfNode(jsonModel.nodes[guids[i]]);
      });
      callback(null, jsonModel);
    }

    /*
    function getMetaSheetInfo(node: Core.Node) {
      let getMemberRegistry =   (setname: string, memberpath: string) => {
        let names = core.getMemberRegistryNames(node, setname, memberpath);
        let registry: Dictionary = {};
        for (let i = 0; i < names.length; i++) {
          let reg = core.getMemberRegistry(node, setname, memberpath, names[i]);
          if (typeof reg === "string") {
            registry[names[i]] = reg;
          }
        }
        return registry;
      };

      let getMemberAttributes =   (setname: string, memberpath: string) => {
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

      let getRegistryEntry =   (setname: string) => {
        if (Array.isArray(registry)) {
          let index = registry.length;

          while (--index >= 0) {
            if (registry[index].SetID === setname) {
              return registry[index];
            }
          }
        }
        return {};
      };
      let sheets: Sheets = {};
      let registry = core.getRegistry(node, "MetaSheets");
      let keys = core.getSetNames(node);

      for (let i = 0; i < keys.length; i++) {
        if (keys[i].indexOf("MetaAspectSet") === 0) {
          let elements = core.getMemberPaths(node, keys[i]);
          for (let j = 0; j < elements.length; j++) {
            let guid = pathCache[elements[j]];
            if (guid) {
              sheets[keys[i]] = sheets[keys[i]] || {};
              sheets[keys[i]][guid] = {
                registry: getMemberRegistry(keys[i], elements[j]),
                attributes: getMemberAttributes(keys[i], elements[j])
              };
            }
          }

          if (sheets[keys[i]] && keys[i] !== "MetaAspectSet") {
            // we add the global registry values as well
            sheets[keys[i]].global = getRegistryEntry(keys[i]);
          }
        }
      }
      return sheets;
    }
    */

    /**
    There is an expectation that every path has a target guid.
    */
    function postProcessPointerTargetEdge(edgeObj: any) {
      if (!pathCache[edgeObj.data.target]) { return; }
      edgeObj.data.target = pathCache[edgeObj.data.target];
    }

    /*
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
    */
    /*
    function postProcessMetaOfNode(jsonNodeObject: any) {
      // replacing and removing items...
      let processMetaPointer =   (jsonPointerObject: JsonObject) => {
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
          if (typeof i === "number") {
            jsonPointerObject.items.splice(i, 1);
            jsonPointerObject.minItems.splice(i, 1);
            jsonPointerObject.maxItems.splice(i, 1);
          }
        }
      };
      let names = Object.keys(jsonNodeObject.meta.pointers || {});
      let processChildrenRule =   (jsonChildrenObject: JsonObject) => {
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
          if (typeof i === "number") {
            jsonChildrenObject.items.splice(i, 1);
            jsonChildrenObject.minItems.splice(i, 1);
            jsonChildrenObject.maxItems.splice(i, 1);
          }
        }
      };
      let processAspectRule =   (aspectElementArray: string[]) => {
        let toRemove: string[] = [];
        for (let i = 0; i < aspectElementArray.length; i++) {
          if (pathCache[aspectElementArray[i]]) {
            aspectElementArray[i] = pathCache[aspectElementArray[i]];
          } else {
            toRemove.push();
          }
        }

        while (toRemove.length > 0) {
          let rm = toRemove.pop();
          if (typeof rm === "number") {
            aspectElementArray.splice(rm, 1);
          }
        }
      };

      for (let i = 0; i < names.length; i++) {
        processMetaPointer(jsonNodeObject.meta.pointers[names[i]]);
      }

      processChildrenRule(jsonNodeObject.meta.children || {
        items: []
      });

      names = Object.keys(jsonNodeObject.meta.aspects || {});
      for (let i = 0; i < names.length; i++) {
        processAspectRule(jsonNodeObject.meta.aspects[names[i]]);
      }

    }
    */

    // here starts the actual processing
    myTick = setInterval(() => {
      if (taskList.length > 0 && notInComputation) {
        let task = taskList.shift();
        if (typeof task === "string") {
          getNodeData(task, (err: Error) => {
            if (err) {
              console.log(err);
            }
            notInComputation = true;
          });
        }
      } else if (taskList.length === 0) {
        clearInterval(myTick);
        postProcessing();
      }
    }, 10);
  }
}
