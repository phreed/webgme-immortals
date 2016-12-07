
require("plugin/PluginBase");

export function addSytacticSuffix(config: GmeConfig.GmeConfig,
    baseFilename: string): string {

    let configDictionary: any = config;
    switch (configDictionary["syntacticVersion"]) {
        case "json:1.0.0":
            return `${baseFilename}.json`;
        case "ttl:1.0.0":
            return `${baseFilename}.ttl`;
        default:
            return `${baseFilename}.txt`;
    }
}