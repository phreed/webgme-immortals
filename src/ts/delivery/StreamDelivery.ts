
import Promise = require("bluebird");
import PluginBase = require("plugin/PluginBase");
import FormData = require("form-data");
import { addSytacticSuffix } from "utility/ConfigUtil";
// import * as http from "http";
// import * as url from "url";

/**
 * This function connects to the designated server and posts 
 * the serialization as a file in multipart/form-data.
 * 
 * The tool used is form-data and request.
 * https://www.npmjs.com/package/form-data
 * 
 */
export function deliverStream(sponsor: PluginBase,
    config: Config.GmeConfig, payload: string): Promise<Core.DataObject> {
    sponsor.logger.info("deliver multipart/form-data to URI");

    if (!config.hasOwnProperty("deliveryUrl")) {
        return Promise.reject(new Error("No uri provided."));
    }
    let configDictionary: any = config;

    return Promise
        .try(() => {
            return addSytacticSuffix(config, configDictionary["fileName"]);
        })
        .then((fileName: string) => {
            let form = new FormData();
            form.append("filename", payload, {
                filename: fileName,
                contentType: "text/plain",
                knownLength: payload.length
            });
            sponsor.logger.info(`payload being written: ${fileName}`);
            let uri = configDictionary["deliveryUrl"];
            form.submit(uri, (_error: any, response: any): void => {
                response.resume();
            });
            sponsor.sendNotification(`payload ${fileName} written`);
            sponsor.result.setSuccess(true);
            sponsor.sendNotification("resolved");
            return Promise.resolve(sponsor.result);
        })
        .catch((err: Error) => {
            sponsor.sendNotification(`problem writing url: ${err.message}`);
            return Promise.reject(err.message);
        });
}

