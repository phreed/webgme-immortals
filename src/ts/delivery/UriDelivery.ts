import Promise = require("bluebird");
import PluginBase = require("plugin/PluginBase");

export function deliverUri(sponsor: PluginBase, 
config: PluginJS.GmeConfig, payload: string): Promise<PluginJS.DataObject> {
    sponsor.logger.info("deliver URI");

    if (!config.hasOwnProperty("uri")) {
        return Promise.reject(new Error("No uri provided."));
    }
    let configDictionary: any = config;
    return Promise
        .try(() => {
            return sponsor.blobClient.createArtifact("pushed");
        })
        .then((artifact) => {
            let pushedFileName = configDictionary["uri"];
            sponsor.logger.debug("Exporting: ", pushedFileName);
            return Promise
                .try(() => {
                    return artifact.addFile(pushedFileName, payload);
                })
                .then(() => {
                    return artifact.save();
                })
                .then((hash: PluginJS.MetadataHash) => {
                    sponsor.result.addArtifact(hash);
                    sponsor.result.setSuccess(true);
                    return Promise.resolve(sponsor.result);
                });
        });
}