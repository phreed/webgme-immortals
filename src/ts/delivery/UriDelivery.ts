
import Promise = require("bluebird");
import PluginBase = require("plugin/PluginBase");
import FormData = require("form-data");
import { addSytacticSuffix } from "utility/ConfigUtil";

/**
 * This function connects to the designated server and posts 
 * the serialization as a file in multipart/form-data.
 * 
 * The tool used is form-data and request.
 * https://www.npmjs.com/package/form-data
 * 
 */
export function deliverMultipart(sponsor: PluginBase,
    config: PluginJS.GmeConfig, payload: string): Promise<PluginJS.DataObject> {
    sponsor.logger.info("deliver multipart/form-data to URI");

    if (!config.hasOwnProperty("uri")) {
        return Promise.reject(new Error("No uri provided."));
    }
    let configDictionary: any = config;

    return Promise
        .try(() => {
            return addSytacticSuffix(config, configDictionary["fileName"]);
        })
        .then((fileName: string) => {
            let form = new FormData();
            form.append("filename", payload);
            sponsor.logger.info(`file being written: ${fileName}`);
            let uri = configDictionary["uri"];
            let submitAsync = Promise.promisify(form.submit);
            return submitAsync(uri);
        })
        .then((res: any) => {
            res.resume();
            sponsor.sendNotification("file written");
            sponsor.result.setSuccess(true);
            sponsor.sendNotification("resolved");
            return Promise.resolve(sponsor.result);
        })
        .catch((err: Error) => {
            sponsor.sendNotification(`problem writing url: ${err.message}`);
            return Promise.reject(err.message);
        });
}