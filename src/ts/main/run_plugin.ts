/*jshint node: true*/
/**
 * @module Bin:RunPlugin
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */
/// <reference types="node" />

/**
 * http://requirejs.org/docs/node.html#3
 */
require("amdefine/intercept");

/**
 * Webgme provides a number of mangers, one being the PluginManager.
 * The plugin-manager allows for the invocation of a plugin in a context.
 */
function executePluginAsync(manager: any,
    name: string, config: any, context: any): Promise<any> {
    return new Promise<any>((resolve, reject) => {
        manager.executePlugin(name, config, context, 
            (err: Error, res: any) => {
                if (err !== null) {
                    reject(`error executing plugin ${name}`);
                } else {
                    console.log(`successfully executed plugin ${name}`);
                    resolve(res);
                }
            });
    });
}

async function primary() {
    let argv = process.argv;

    let path = require("path");
    let configDir = path.join(process.cwd(), "dist-client/config");
    let gmeConfig = require(configDir);
    let config = gmeConfig.config;
    let MongoURI = require("mongo-uri");
    let Command = require("commander").Command;
    let webgme = require("webgme");

    let logger = webgme.Logger.create("gme:bin:runplugin", config.bin.log);

    let program = new Command();
    let STORAGE_CONSTANTS = webgme.requirejs("common/storage/constants");
    let PluginCliManager = webgme.PluginCliManager;

    webgme.addToRequireJsPaths(config);
    program
        .version("2.2.0")
        .arguments("<pluginName> <projectName>")
        .option("-b, --branchName [string]", "Name of the branch to load and save to.", "master")
        .option("-c, --commitHash [string]", "Commit hash to run from, if set branch will only be used for update.")
        .option("-a, --activeNode [string]", "ID/Path to active node.", "")
        .option("-s, --activeSelection [string]", "IDs/Paths of selected nodes (comma separated with no spaces).",
        (val: string) => {
            return val ? val.split(",") : [];
        })
        .option("-n, --namespace [string]",
        "Namespace the plugin should run under.", "")
        .option("-m, --mongo-database-uri [url]",
        "URI of the MongoDB [default from the configuration file]", config.mongo.uri)
        .option("-u, --user [string]", "the user of the command [if not given we use the default user]",
        config.authentication.guestAccount)
        .option("-o, --owner [string]", "the owner of the project [by default, the user is the owner]")
        .option("-j, --pluginConfigPath [string]",
        "Path to json file with plugin options that should be overwritten.", "")

        .on("--help", () => {
            let env = process.env.NODE_ENV || "default";
            console.log("  Examples:");
            console.log();
            console.log("    $ node run_plugin.js PluginGenerator TestProject");
            console.log("    $ node run_plugin.js PluginGenerator TestProject -b branch1 -j pluginConfig.json");
            console.log("    $ node run_plugin.js MinimalWorkingExample TestProject -a /1/b");
            console.log("    $ node run_plugin.js MinimalWorkingExample TestProject -s /1,/1/c,/d");
            console.log("    $ node run_plugin.js MinimalWorkingExample TestProject -c #123..");
            console.log("    $ node run_plugin.js MinimalWorkingExample TestProject -b b1 -c " +
                "#def8861ca16237e6756ee22d27678d979bd2fcde");
            console.log();
            console.log("  Plugin paths using " + configDir + path.sep + "config." + env + ".js :");
            console.log();
            for (let path of config.plugin.basePaths) {
                console.log(`    "${path}"`);
            }
        })
        .parse(argv);

    if (program.args.length < 2) {
        program.help();
        return Promise.reject(new Error("A project and pluginName must be specified."));
    }

    // this line throws a TypeError for invalid databaseConnectionString
    MongoURI.parse(program.mongoDatabaseUri);

    config.mongo.uri = program.mongoDatabaseUri;

    let pluginName = program.args[0];
    let projectName = program.args[1];
    logger.info(`Executing ${pluginName} plugin on ${projectName} in branch ${program.branchName}`);

    let pluginConfig = {};
    if (program.pluginConfigPath) {
        try {
            pluginConfig = require(path.resolve(program.pluginConfigPath));
        } catch (e) {
            return Promise.reject(e);
        }
    }

    let gmeAuth: any = undefined;
    try {
        gmeAuth = await webgme.getGmeAuth(config);
    } catch (_err) {
        throw new Error("problem with authorization");
    }
    let storage = await webgme.getStorage(logger, config, gmeAuth);
    await storage.openDatabase();

    let params = {
        projectId: "",
        username: program.user
    };
    logger.info("Database is opened.");

    if (program.owner) {
        params.projectId = program.owner + STORAGE_CONSTANTS.PROJECT_ID_SEP + projectName;
    } else {
        params.projectId = program.user + STORAGE_CONSTANTS.PROJECT_ID_SEP + projectName;
    }

    let project = await storage.openProject(params);

    logger.info("Project is opened.");
    let projectAuthParams = {
        entityType: gmeAuth.authorizer.ENTITY_TYPES.PROJECT,
    };

    if (program.user) {
        project.setUser(program.user);
    }
    let projectAccess = await gmeAuth.authorizer.getAccessRights(params.username, params.projectId, projectAuthParams);

    logger.info("User has the following rights to the project: ", projectAccess);
    let commitHash: string = "";
    try {
        commitHash = await project.getBranchHash(program.branchName);
    } catch (_err) {
        throw new Error(`problem acquiring branch ${program.branchName} hash`);
    }
    let pluginManager = new PluginCliManager(project, logger, config);
    let context = {
        activeNode: program.activeNode,
        activeSelection: program.activeSelection || [],
        branchName: program.branchName,
        commitHash: program.commitHash || commitHash,
        namespace: program.namespace
    };
    pluginManager.projectAccess = projectAccess;
    let pluginResult = await executePluginAsync(pluginManager, pluginName, pluginConfig, context);

    await Promise.all([storage.closeDatabase(), gmeAuth.unload()]);

    if (pluginResult["success"] && pluginResult.success === true) {
        console.info(`execution was successful: ${result}`);
        process.exit(0);
    } else {
        console.error("execution failed:", JSON.stringify(result, null, 2));
        process.exit(1);
    }
}

if (require.main !== module) {
    console.error("not a module");
    process.exit(1);
}
let result = primary();


