/*globals define*/
/*jshint node:true, browser:true*/

/**
 * Generated by PluginGenerator 1.7.0 from webgme on Thu Jun 23 2016 15:47:57 GMT-0500 (CDT).
 * A plugin that inherits from the PluginBase. To see source code documentation about available
 * properties and methods visit %host%/docs/source/PluginBase.html.
 */

import PluginBase = require('plugin/PluginBase');
import PluginConfig = require('plugin/PluginConfig');
import MetaDataStr = require('text!./metadata.json');

const REF_PREFIX = '#//';
const POINTER_SET_DIV = '-';
const CONTAINMENT_PREFIX = '';
const ROOT_NAME = 'ROOT';
const NS_URI = 'www.webgme.org';
const DATA_TYPE_MAP = {
  string: 'ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString',
  float: 'ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EFloat',
  integer: 'ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EInt',
  boolean: 'ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EBoolean',
  asset: 'ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString',
};

class StreamingPlugin extends PluginBase {
  pluginMetadata: any;

  constructor() {
    super();
    this.pluginMetadata = JSON.parse(MetaDataStr);
  }



  /**
    Main function for the plugin to execute. This will perform the execution.
    Notes:
   - Always log with the provided logger.[error,warning,info,debug].
    - Do NOT put any user interaction logic UI, etc. inside this method.
    - callback always has to be called even if error happened.

    @param {function(string, plugin.PluginResult)} callback - the result callback
   */
  main(mainHandler: PluginJS.Callback): void {
    let core = this.core;
    let config = this.getCurrentConfig();
    let configDictionary:any = config;
    if (!configDictionary.hasOwnProperty('fileName')) {
      mainHandler(new Error('No file name provided.'), this.result);
    }
    let recorder = () => {
      let payload: BlobJS.ObjectBlob;
      let artifact = this.blobClient.createArtifact('serialized');
      artifact.addFile(configDictionary['fileName'], payload,
        (err: Error) => {
          if (err) {
            mainHandler(err, this.result);
            return;
          }
          artifact.save(
            (err: Error, hash: PluginJS.ObjectHash) => {
              if (err) {
                mainHandler(err, this.result);
                return;
              }
              this.result.addArtifact(hash);
              this.result.setSuccess(true);
              mainHandler(null, this.result);
            });
        });
    };
    /**
    Visitor function.
    */
    let languageName = core.getAttribute(this.rootNode, 'name');
    let data : PluginJS.Dictionary = {
      '@xmi:version': '2.0',
      '@xmlns:xmi': 'http://www.omg.org/XMI',
      '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance'
    };
    let fcoName = core.getAttribute(core.getFCO(this.rootNode), 'name');
    let path2data : PluginJS.Dictionary = {};

    data['@xmlns:' + languageName] = NS_URI;
    data['@xsi:schemaLocation'] = NS_URI + ' ' + languageName + '.ecore';
    path2data[''] = data;

    function visitFn(node: Node, nextFn: PluginJS.VoidCallback): Q.Promise<{}> {
      let core = this.core;
      let deferred = Q.defer();
      // let nodeName = core.getAttribute(node, 'name');
      let parent = core.getParent(node);
      let parentData = path2data[core.getPath(parent)];
      let metaNode = core.getBaseType(node);
      // metaNode ?
      let metaName = core.getAttribute(metaNode, 'name') || ':LibraryRoot:';
      let containRel = CONTAINMENT_PREFIX + core.getAttribute(metaNode, 'name');
      let nodeData: PluginJS.Dictionary = { '@xsi:type': languageName + ':' + containRel };
      let baseNode = core.getBase(node);
      let promises: any[] = [];
      let nodePath = core.getPath(node);

      path2data[nodePath] = nodeData;
      parentData[containRel] = parentData[containRel] || [];
      parentData[containRel].push(nodeData);

      nodeData['@_id'] = core.getGuid(node);
      core.getAttributeNames(node).forEach((attrName: string) => {
        nodeData['@' + attrName] = core.getAttribute(node, attrName);
      });

      // get Pointers
      core.getPointerNames(node).forEach((ptrName: string) => {
        let targetPath = core.getPointerPath(node, ptrName);
        if (targetPath) {
          promises.push(
            core.loadByPath(this.rootNode, targetPath)
              .then((targetNode: Node) => {
                if (ptrName === 'base') {
                  nodeData['@' + ptrName + POINTER_SET_DIV + fcoName]
                    = core.getGuid(targetNode);
                } else {
                  let targetMetaNode = core.getBaseType(targetNode);
                  let targetMetaName = core.getAttribute(targetMetaNode, 'name');
                  nodeData['@' + ptrName + POINTER_SET_DIV + targetMetaName]
                    = core.getGuid(targetNode);
                }
              })
          );
        }
      });

      // get Sets

      Q.all(promises)
        .then(deferred.resolve)
        .catch(deferred.reject);
      return deferred.promise.nodeify(nextFn);
    }

    /**
    Visit the node and perform the function.
    */
    this.core
      .traverse(this.rootNode, { excludeRoot: true }, visitFn)
      .then(() => {
        console.log("DATA: "+ data);
        return data;
      });
  }
}

export = StreamingPlugin;
