

import PluginBase = require("plugin/PluginBase");
import fs = require("fs-extra");
import { addSytacticSuffix } from "utility/ConfigUtil";

/**
 A function to deliver the serialized object properly.

* @param {}
*/

export async function deliverFile(sponsor: PluginBase, config: GmeConfig.GmeConfig, payload: string): Promise<GmeClasses.Result> {
    sponsor.logger.info(`deliver file of size: ${payload.length}`);

    let configDictionary: any = config;
    if (!configDictionary.hasOwnProperty("topic")) {
        return Promise.reject(new Error("No file name provided."));
    }
    sponsor.sendNotification("config has property");

    try {
        let targetFileName = await addSytacticSuffix(config, configDictionary["topic"]);
        fs.ensureFileSync(targetFileName);
        let fileName = targetFileName;

        sponsor.logger.info(`file being written: ${fileName} in ${process.cwd()}`);
        fs.writeFileSync(fileName, payload);
        sponsor.sendNotification(`file ${fileName} written`);
        sponsor.result.setSuccess(true);
        return Promise.resolve(sponsor.result);
    }
    catch (err) {
        sponsor.sendNotification(`problem writing file: ${err.message}`);
        return Promise.reject(err.message);
    }
}