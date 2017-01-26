
/**
 Copyright Fred Eisele 2016
 
 http://immortals.isis.vanderbilt.edu:8955/docs/source/PluginConfig.html

 The metadata.json needs to be copied as well.
 */
import PluginBase = require("plugin/PluginBase");
import MetaDataStr = require("text!plugins/PullPlugin/metadata.json");

interface ConfigDict {
  mode?: string;
  file?: string;
  deliveryUrl?: string;
  query?: string;
}

class PullPlugin extends PluginBase {
  pluginMetadata: any;

  /*
  * Initializes a new instance of pull.
  * @class
  * @augments {PluginBase}
  * @classdesc This class represents the plugin pull.
  * @constructor
  */
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
 
    When this runs the core api is used to extract the meta-model and
    the model instance from the system multi-model. The super-model contains
    all of the models used to describe the target system.
    The current model is replacd with the requested model.
 
   * @param {function(string, plugin.PluginResult)} callback - the result callback
   */

  public async main(callback: GmeCommon.ResultCallback<GmeClasses.Result>): Promise<void> {
    let self = this;
    // let baseNode = self.core.getBase();
    let currentConfig = this.getCurrentConfig();
    this.sendNotification(`The push plugin function is running: ${new Date(Date.now()).toTimeString()}`);
    let configDictionary: ConfigDict = currentConfig;

    switch (configDictionary.mode) {
      case "file":
        if (!configDictionary.file) {
          callback(new Error("No file provided."), this.result);
          return Promise.reject("no file provided");
        }
        let saveFile = "";
        this.blobClient.getObject(configDictionary.file, saveFile);
        break;
      case "websocket":
        if (!configDictionary.deliveryUrl) {
          callback(new Error("No host address provided."), this.result);
          return Promise.reject("no host address provided");
        }
        let deliveryUrl = configDictionary.deliveryUrl;
        if (typeof deliveryUrl === "string") {
          let saveWebsocket = "";
          this.blobClient.getObject(deliveryUrl, saveWebsocket);
        }
        break;
      default:
        callback(new Error("unknown mode provided."), this.result);
        return Promise.reject("unknown mode provided");
    }

    try {
      let jsonOrBuf: any;
      if (typeof configDictionary.file === "string") {
        this.sendNotification("creating artifact");

        jsonOrBuf = await self.blobClient.getObject(configDictionary.file, "");
      } else {
        return Promise.reject(`file name not a string ${typeof configDictionary.file}`);
      }
      let dataModel: any;
      if (typeof Buffer !== "undefined" && jsonOrBuf instanceof Buffer) {
        // This clause is entered when the plugin in executed in a node process (on the server) rather than
        // in a browser. Then the getObject returns a Buffer and we need to convert it to string and then
        // parse it into an object.

        jsonOrBuf = String.fromCharCode.apply(null, new Uint8Array(jsonOrBuf));
        dataModel = JSON.parse(jsonOrBuf);

      } else {
        // In the browser the getObject automatically returns a json object.
        dataModel = jsonOrBuf;
      }
      this.logger.info("Obtained dataModel", dataModel);
      // this.buildUpFMDiagram(dataModel);
      await self.save("FSM Importer created new model.");

      this.result.setSuccess(true);
      callback(null, this.result);
    } catch (err) {
      callback(err, this.result);
    }
  }
}

// the following returns the plugin class function
export = PullPlugin;