
import Promise = require("bluebird");
import PluginBase = require("plugin/PluginBase");
import fs = require("fs-extra");
import { addSytacticSuffix } from "utility/ConfigUtil";

/**
 A function to deliver the serialized object properly.

* @param {}
*/

export function deliverFile(sponsor: PluginBase, config: PluginJS.GmeConfig, payload: string): Promise<PluginJS.DataObject> {
    sponsor.logger.info(`deliver file of size: ${payload.length}`);

    let configDictionary: any = config;
    if (!configDictionary.hasOwnProperty("fileName")) {
        return Promise.reject(new Error("No file name provided."));
    }
    sponsor.sendNotification("config has property");

    return Promise
        .try(() => {
            let targetFileName = addSytacticSuffix(config, configDictionary["fileName"]);
            fs.ensureFileSync(targetFileName);
            return targetFileName;
        })
        .then((fileName: string) => {
            sponsor.logger.info(`file being written: "}${fileName}`);
            return fs.writeFileSync(fileName, payload);
        })
        .then(() => {
            sponsor.sendNotification("file written");
            sponsor.result.setSuccess(true);
            sponsor.sendNotification("resolved");
            return Promise.resolve(sponsor.result);
        })
        .catch((err: Error) => {
            sponsor.sendNotification(`problem writing file: ${err.message}`);
            return Promise.reject(err.message);
        });
}