

import PluginBase = require("plugin/PluginBase");
import { addSytacticSuffix } from "utility/ConfigUtil";

/**
 A function to deliver the serialized object properly.

* @param {}
*/
export async function deliverArtifact(sponsor: PluginBase, config: GmeConfig.GmeConfig, payload: string): Promise<GmeClasses.Result> {

    let configDictionary: any = config;
    sponsor.logger.info("deliver artifact");

    if (!configDictionary.hasOwnProperty("topic")) {
        return Promise.reject(new Error("No file name provided."));
    }
    sponsor.sendNotification("config has property");

    try {
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
        let artifact = await sponsor.blobClient.createArtifact(artifactName);

        sponsor.sendNotification("artifact created");
        let pushedTopic = addSytacticSuffix(config, configDictionary["topic"]);


        sponsor.sendNotification(`adding: ${pushedTopic}`);
        let hash = await artifact.addFile(pushedTopic, payload);

        sponsor.sendNotification(`saving: ${hash}`);
        let reHash = await artifact.save();

        sponsor.sendNotification(`adding artifact: ${reHash}`);
        sponsor.result.addArtifact(reHash);
        sponsor.result.setSuccess(true);
        sponsor.sendNotification("resolution");
        return Promise.resolve(sponsor.result);
    } catch (err) {
        sponsor.sendNotification(`problem in file delivery: ${err.message}`);
        return Promise.reject(err.message);
    }
}