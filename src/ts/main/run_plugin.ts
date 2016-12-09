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
const Prom = require("bluebird");

Prom
    .try(() => {
        if (require.main !== module) {
            return Prom.reject();
        }
        return process.argv;
    })
    .then((argv: string[]) => {

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
            return Prom.reject(new Error("A project and pluginName must be specified."));
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
                return Prom.reject(e);
            }
        }

        let storage: any = undefined;
        let gmeAuth: any = undefined;
        let params: any = undefined;
        let project: any = undefined;
        let projectAccess: any = undefined;
        let pluginResult: any = undefined;
        let err: any = undefined;
        return Prom
            .try(() => {
                return webgme.getGmeAuth(config);
            })
            .catch((_err: Error) => {
                throw new Error("problem with authorization");
            })
            .then((gmeAuth_: any) => {
                gmeAuth = gmeAuth_;
                storage = webgme.getStorage(logger, config, gmeAuth);
                return storage.openDatabase();
            })
            .then(() => {
                params = {
                    projectId: "",
                    username: program.user
                };
                logger.info("Database is opened.");

                if (program.owner) {
                    params.projectId = program.owner + STORAGE_CONSTANTS.PROJECT_ID_SEP + projectName;
                } else {
                    params.projectId = program.user + STORAGE_CONSTANTS.PROJECT_ID_SEP + projectName;
                }

                return storage.openProject(params);
            })
            .then((project_: any) => {
                logger.info("Project is opened.");
                let projectAuthParams = {
                    entityType: gmeAuth.authorizer.ENTITY_TYPES.PROJECT,
                };
                project = project_;

                if (program.user) {
                    project.setUser(program.user);
                }
                return gmeAuth.authorizer.getAccessRights(params.username, params.projectId, projectAuthParams);
            })
            .then((access: any) => {
                logger.info("User has the following rights to the project: ", access);
                projectAccess = access;
                return project.getBranchHash(program.branchName);
            })
            .catch((_err: Error) => {
                throw new Error(`problem acquiring branch ${program.branchName} hash`);
            })
            .then((commitHash: any) => {
                let pluginManager = new PluginCliManager(project, logger, config);
                let exec = Prom.promisify(pluginManager.executePlugin, pluginManager);
                let context = {
                    activeNode: program.activeNode,
                    activeSelection: program.activeSelection || [],
                    branchName: program.branchName,
                    commitHash: program.commitHash || commitHash,
                    namespace: program.namespace
                };
                pluginManager.projectAccess = projectAccess;
                return exec(pluginName, pluginConfig, context);
            })
            .catch((err_: Error) => {
                err = err_;
            })
            .then((result: any) => {
                pluginResult = result;
                return result;
            })
            .finally(() => {
                logger.debug("Closing database connections...");
                return Prom
                    .all([storage.closeDatabase(), gmeAuth.unload()])
            });
    })
    .then((result: any) => {

        // if (result.success === true) {
        console.info(`execution was successful: ${result}`);
        process.exit(0);
        // } else {
        console.error("execution failed:", JSON.stringify(result, null, 2));
        process.exit(1);
        // }
    })
    .catch((err: Error) => {
        console.error("Could not open the project or branch", err);
        process.exit(1);
    });

