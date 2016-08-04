/*globals define*/
/*jshint node: true, browser: true*/

/**
 * this module implements the node-by-node serialization
 * @author phreed
 */

define(["require", "exports", 'common/util/assert', 'common/util/canon'],
  function(require, exports, ASSERT, CANON) {

    'use strict';

    function exportMegaModel(core, libraryRoot, callback) {
      //export-global variables and their initialization
      var jsonModel = {
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
        },
        guidCache = {},
        pathCache = {},
        nodeCache = {},
        root = core.getRoot(libraryRoot),
        taskList = [core.getPath(libraryRoot)],
        notInComputation = true,
        myTick;
      //necessary functions for the export method

      function isInLibrary(node) {
        while (node) {
          if (core.getGuid(node) === jsonModel.root.guid) {
            return true;
          }
          node = core.getParent(node);
        }
        return false;
      }

      function checkForExternalBases(node) {
        var guid,
          path;
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

      function fillContainment(node) {
        //first we compute the guid chain up to the library root
        var guidChain = [],
          actualGuid = core.getGuid(node),
          containment = jsonModel.containment;
        while (actualGuid !== jsonModel.root.guid) {
          guidChain.unshift(actualGuid);
          node = core.getParent(node);
          actualGuid = core.getGuid(node);
        }

        //now we insert our guid into the containment tree structure
        if (guidChain.length) {
          while (guidChain.length > 1) {
            containment = containment[guidChain.shift()];
            ASSERT(typeof containment !== 'undefined');
          }
          containment[guidChain.shift()] = {};
        }
      }

      function getAttributesOfNode(node) {
        var names = core.getOwnAttributeNames(node).sort(),
          i,
          result = {};
        for (i = 0; i < names.length; i++) {
          result[names[i]] = core.getAttribute(node, names[i]);
        }
        return result;
      }

      function getRegistryOfNode(node) {
        var names = core.getOwnRegistryNames(node).sort(),
          i,
          result = {};
        for (i = 0; i < names.length; i++) {
          result[names[i]] = core.getRegistry(node, names[i]);
        }
        return result;
      }

      function getPointersOfNode(node) {
        //this version only puts paths to target so they need to be either removed or replaced by guid targets
        // The 'base' pointer is a redundant artifact
        // and should not appear in the export file.
        var names = core.getOwnPointerNames(node).sort(),
          i,
          candidate,
          result = {};
        for (i = 0; i < names.length; i++) {
          candidate = names[i];
          if (candidate == 'base') continue;
          result[candidate] = core.getPointerPath(node, candidate);
        }
        return result;
      }

      function getSetsOfNode(node) {
        //we collect all set - but we keep only those data which were defined on this given level
        var names = core.getSetNames(node),
          sets = {},
          jsonSet,
          i,
          getMemberData = function(setName, memberPath) {
            var data = {
                attributes: {},
                registry: {}
              },
              i, names;
            //attributes
            names = core.getMemberAttributeNames(node, setName, memberPath);
            for (i = 0; i < names.length; i++) {
              data.attributes[names[i]] = core.getMemberAttribute(node, setName, memberPath, names[i]);
            }

            //registry
            names = core.getMemberRegistryNames(node, setName, memberPath);
            for (i = 0; i < names.length; i++) {
              data.registry[names[i]] = core.getMemberRegistry(node, setName, memberPath, names[i]);
            }
            return data;
          },
          getOwnMemberData = function(setName, memberPath) {
            var base = core.getBase(node),
              names,
              i,
              data = {
                attributes: {},
                registry: {}
              },
              value;

            //no base
            if (!base) {
              return getMemberData(setName, memberPath);
            }

            //the whole set was defined in the given level
            if (core.getSetNames(base).indexOf(setName) === -1) {
              return getMemberData(setName, memberPath);
            }

            //the whole member was defined on the given level
            if (core.getMemberPaths(base, setName).indexOf(memberPath) === -1) {
              return getMemberData(setName, memberPath);
            }

            //so we have the same member, let's check which values differ from the inherited one
            //attributes
            names = core.getMemberAttributeNames(node, setName, memberPath);
            for (i = 0; i < names.length; i++) {
              value = core.getMemberAttribute(node, setName, memberPath, names[i]);
              if (CANON.stringify(core.getMemberAttribute(base, setName, memberPath, names[i])) !==
                CANON.stringify(value)) {

                data.attributes[names[i]] = value;
              }
            }

            //registry
            names = core.getMemberRegistryNames(node, setName, memberPath);
            for (i = 0; i < names.length; i++) {
              value = core.getMemberRegistry(node, setName, memberPath, names[i]);
              if (CANON.stringify(core.getMemberRegistry(base, setName, memberPath, names[i])) !==
                CANON.stringify(value)) {

                data.attributes[names[i]] = value;
              }
            }

            return data;

          },
          getSetData = function(setName) {
            var data = {},
              members = core.getMemberPaths(node, setName),
              i, member;

            for (i = 0; i < members.length; i++) {
              member = getOwnMemberData(setName, members[i]);
              if (Object.keys(member).length > 0) {
                data[members[i]] = member;
              }
            }
            return data;
          };
        for (i = 0; i < names.length; i++) {
          jsonSet = getSetData(names[i]);
          if (Object.keys(jsonSet).length > 0) {
            sets[names[i]] = jsonSet;
          }
        }
        return sets;
      }

      function getNodeData(path, next) {
        var jnode = {},
          guid;
        notInComputation = false;
        core.loadByPath(root, path, function(err, node) {
          if (err || !node) {
            return next(err || new Error('no node found at given path:' + path));
          }

          //fill out the basic data and make place in the jsonModel for the node
          guid = core.getGuid(node);
          ASSERT(!nodeCache[guid]);

          guidCache[guid] = path;
          pathCache[path] = guid;
          nodeCache[guid] = jnode;
          jsonModel.elements.nodes.push({
            data: jnode
          });

          var attributes = getAttributesOfNode(node);
          jnode.id = guid;
          for (var pname in attributes) {
            jnode[pname] = attributes[pname];
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

          var pointers = getPointersOfNode(node);
          for (var ptrKey in pointers) {
            var ptr = pointers[ptrKey];
            if (!ptr) {
              console.log("null target path : " + ptrKey);
            } else {
              jsonModel.elements.edges.push({
                data: {
                  source: guid,
                  target: ptr,
                  type: "points-to",
                  pname: ptrKey }
              });
            }
          }
          // var sets = getSetsOfNode(node);
          // var meta = core.getOwnJsonMeta(node);

          //putting children into task list
          taskList = taskList.concat(core.getChildrenPaths(node));

          next(null);
        });
      }

      function postProcessing() {
        var guids = Object.keys(jsonModel.elements.edges);
        for (let edge of jsonModel.elements.edges) {
          switch (edge.data.type) {
            case "points-to":
              postProcessPointerTargetEdge(edge);
              break;
            case "is-contained-in":
            case "is-based-on":
              // good pointers than need no repair
              break;
            default:
              console.log("unknown pointer type : " + edge.data.type);
          }
          // postProcessMembersOfSets(jsonModel.nodes[guids[i]]);
          // postProcessMetaOfNode(jsonModel.nodes[guids[i]]);
        }
        callback(null, jsonModel);
      }

      function getMetaSheetInfo(node) {
        var getMemberRegistry = function(setname, memberpath) {
            var names = core.getMemberRegistryNames(node, setname, memberpath),
              i,
              registry = {};
            for (i = 0; i < names.length; i++) {
              registry[names[i]] = core.getMemberRegistry(node, setname, memberpath, names[i]);
            }
            return registry;
          },
          getMemberAttributes = function(setname, memberpath) {
            var names = core.getMemberAttributeNames(node, setname, memberpath),
              i,
              attributes = {};
            for (i = 0; i < names.length; i++) {
              attributes[names[i]] = core.getMemberAttribute(node, setname, memberpath, names[i]);
            }
            return attributes;
          },
          getRegistryEntry = function(setname) {
            var index = registry.length;

            while (--index >= 0) {
              if (registry[index].SetID === setname) {
                return registry[index];
              }
            }
            return {};
          },
          sheets = {},
          registry = core.getRegistry(node, 'MetaSheets'),
          keys = core.getSetNames(node),
          elements, guid,
          i, j;
        for (i = 0; i < keys.length; i++) {
          if (keys[i].indexOf('MetaAspectSet') === 0) {
            elements = core.getMemberPaths(node, keys[i]);
            for (j = 0; j < elements.length; j++) {
              guid = pathCache[elements[j]];
              if (guid) {
                sheets[keys[i]] = sheets[keys[i]] || {};
                sheets[keys[i]][guid] = {
                  registry: getMemberRegistry(keys[i], elements[j]),
                  attributes: getMemberAttributes(keys[i], elements[j])
                };
              }
            }

            if (sheets[keys[i]] && keys[i] !== 'MetaAspectSet') {
              //we add the global registry values as well
              sheets[keys[i]].global = getRegistryEntry(keys[i]);
            }
          }
        }
        return sheets;
      }

      /**
      There is an expectation that every path has a target guid.
      */
      function postProcessPointerTargetEdge(edgeObj) {
        if (!pathCache[edgeObj.data.target]) return;
        edgeObj.data.target = pathCache[edgeObj.data.target];
      }

      function postProcessMembersOfSets(jsonNodeObject) {
        var setNames = Object.keys(jsonNodeObject.sets),
          i,
          memberPaths, j;

        for (i = 0; i < setNames.length; i++) {
          memberPaths = Object.keys(jsonNodeObject.sets[setNames[i]]);
          for (j = 0; j < memberPaths.length; j++) {
            if (pathCache[memberPaths[j]]) {
              jsonNodeObject.sets[setNames[i]][pathCache[memberPaths[j]]] =
                jsonNodeObject.sets[setNames[i]][memberPaths[j]];
            }
            delete jsonNodeObject.sets[setNames[i]][memberPaths[j]];
          }
        }
      }

      function postProcessMetaOfNode(jsonNodeObject) {
        //replacing and removing items...
        var processMetaPointer = function(jsonPointerObject) {
            var toRemove = [],
              i;
            for (i = 0; i < jsonPointerObject.items.length; i++) {
              if (pathCache[jsonPointerObject.items[i]]) {
                jsonPointerObject.items[i] = pathCache[jsonPointerObject.items[i]];
              } else {
                toRemove.push(i);
              }
            }
            while (toRemove.length > 0) {
              i = toRemove.pop();
              jsonPointerObject.items.splice(i, 1);
              jsonPointerObject.minItems.splice(i, 1);
              jsonPointerObject.maxItems.splice(i, 1);
            }
          },
          i,
          names = Object.keys(jsonNodeObject.meta.pointers || {}),
          processChildrenRule = function(jsonChildrenObject) {
            var toRemove = [],
              i;
            for (i = 0; i < jsonChildrenObject.items.length; i++) {
              if (pathCache[jsonChildrenObject.items[i]]) {
                jsonChildrenObject.items[i] = pathCache[jsonChildrenObject.items[i]];
              } else {
                toRemove.push(i);
              }
            }

            while (toRemove.length > 0) {
              i = toRemove.pop();
              jsonChildrenObject.items.splice(i, 1);
              jsonChildrenObject.minItems.splice(i, 1);
              jsonChildrenObject.maxItems.splice(i, 1);
            }
          },
          processAspectRule = function(aspectElementArray) {
            var toRemove = [],
              i;
            for (i = 0; i < aspectElementArray.length; i++) {
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

        for (i = 0; i < names.length; i++) {
          processMetaPointer(jsonNodeObject.meta.pointers[names[i]]);
        }

        processChildrenRule(jsonNodeObject.meta.children || {
          items: []
        });

        names = Object.keys(jsonNodeObject.meta.aspects || {});
        for (i = 0; i < names.length; i++) {
          processAspectRule(jsonNodeObject.meta.aspects[names[i]]);
        }

      }

      // here starts the actual processing
      myTick = setInterval(function() {
        if (taskList.length > 0 && notInComputation) {
          getNodeData(taskList.shift(), function(err) {
            if (err) {
              console.log(err);
            }
            notInComputation = true;
          });
        } else if (taskList.length === 0) {
          clearInterval(myTick);
          postProcessing();
        }
      }, 10);
    }

    var CyjsSerializer = (function () {
      function CyjsSerializer() {}
      CyjsSerializer.export = exportMegaModel;
      // CyjsSerializer.import = importLibrary;
      return CyjsSerializer;
    }());
    exports.__esModule = true;
    exports["default"] = CyjsSerializer;

    return {
      export: exportMegaModel
    };
  });
