import Promise = require("bluebird");
import PluginBase = require("plugin/PluginBase");

/**
 A function to deliver the serialized object properly.

* @param {}
*/
export function deliverArtifact(sponsor: PluginBase, config: PluginJS.GmeConfig, payload: string): Promise<PluginJS.DataObject> {

    let configDictionary: any = config;
    sponsor.logger.info("deliver artifact");

    if (!configDictionary.hasOwnProperty("fileName")) {
        return Promise.reject(new Error("No file name provided."));
    }
    sponsor.sendNotification("config has property");

    return Promise
        .try(() => {
            let artifactName = "stream-";
            switch (configDictionary["schematicVersion"]) {
                case "schema-tree:1.0.0":
                    artifactName += "schema-tree";
                    break;
                case "schema-flat:1.0.0":
                    artifactName += "schema-flat";
                    break;
                case "model-tree:1.0.0":
                    artifactName += "model-tree";
                    break;
                case "model-flat:1.0.0":
                    artifactName += "model-flat";
                    break;
            }
            return sponsor.blobClient.createArtifact(artifactName);
        })
        .then((artifact) => {
            sponsor.sendNotification("artifact created");
            let pushedFileName = configDictionary["fileName"];
            switch (configDictionary["syntacticVersion"]) {
                case "json:1.0.0":
                    pushedFileName += ".json";
                    break;
                case "ttl:1.0.0":
                    pushedFileName += ".ttl";
                    break;
                default:
                    pushedFileName += ".txt";
            }
            return Promise
                .try(() => {
                    sponsor.sendNotification(`adding: ${pushedFileName}`);
                    return artifact.addFile(pushedFileName, payload);
                })
                .then((hash: PluginJS.MetadataHash) => {
                    sponsor.sendNotification("saving: " + hash);
                    return artifact.save();
                });
        })
        .then((hash: PluginJS.MetadataHash) => {
            sponsor.sendNotification(`adding artifact: ${hash}`);
            sponsor.result.addArtifact(hash);
            sponsor.result.setSuccess(true);
            sponsor.sendNotification("resolution");
            return Promise.resolve(sponsor.result);
        })
        .catch((err: Error) => {
            sponsor.sendNotification(`problem in file delivery: ${err.message}`);
            return Promise.reject(err.message);
        });
}