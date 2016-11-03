
import Promise = require("bluebird");
import PluginBase = require("plugin/PluginBase");
import fs = require("fs-extra");
import { addSytacticSuffix } from "utility/ConfigUtil";

/**
 A function to deliver the serialized object properly.

* @param {}
*/

export function deliverFile(sponsor: PluginBase, config: Config.GmeConfig, payload: string): Promise<Core.Result> {
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
            sponsor.logger.info(`file being written: ${fileName} in ${process.cwd()}`);
            fs.writeFileSync(fileName, payload);
            sponsor.sendNotification(`file ${fileName} written`);
            sponsor.result.setSuccess(true);
            return Promise.resolve(sponsor.result);
        })
        .catch((err: Error) => {
            sponsor.sendNotification(`problem writing file: ${err.message}`);
            return Promise.reject(err.message);
        });
}