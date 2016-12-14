/**
 * A plugin that inherits from the PluginBase.
 * To see source code documentation about available
 * properties and methods visit %host%/docs/source/PluginBase.html.
 * 
 * The idea here is to export all of the commits 
 * to a stream processor. From there the commits will
 * be extracted and used to construct different 
 * data-structures suitable for various questions and
 * the generation of derived and related facts.
 * In particular the incorporation of static and 
 * dynamic information about the system environment
 * and constructed components.
 */

// import _ = require("underscore");
import PluginBase = require("plugin/PluginBase");
import MetaDataStr = require("text!plugins/StreamPlugin/metadata.json");
import { Producer, KeyedMessage, Client, ProduceRequest } from "kafka-node";
import { GmeRegExp } from "utility/GmeRegExp";

interface Sender {
    (req: Array<ProduceRequest>): Promise<any>;
}

class ResultTree {
    root: Core.Node | null;
    branchName: GmeCommon.Name;
    commitHash: GmeStorage.CommitHash;
    static factory() {
        return new ResultTree(null, "", "");
    }
    constructor(root: Core.Node | null, branchName: GmeCommon.Name, commit: GmeStorage.CommitHash) {
        this.root = root;
        this.branchName = branchName;
        this.commitHash = commit;
    }
}

type CommitBunch = Array<GmeStorage.CommitObject>;

const BATCH_SIZE = 20;

async function getCommits(project: GmeClasses.Project,
    startingPoint: GmeStorage.CommitHash,
    terminationPoint: GmeStorage.CommitHash) {
    let collection: CommitBunch = [];
    let moreCommits = true;
    let currentPoint = startingPoint;
    while (moreCommits) {
        let history = await project.getHistory(currentPoint, BATCH_SIZE);

        for (let commit of history) {
            if (commit._id === terminationPoint) {
                return Promise.resolve(collection);
            }
            collection.push(commit);
            currentPoint = commit._id;
        }
        if (history.length < BATCH_SIZE) {
            return Promise.resolve(collection);
        }
    }
    return Promise.reject(new Error(`could not get commits`));
}

async function deliverCommits(
    core: GmeClasses.Core, project: GmeClasses.Project,
    sender: any, collection: CommitBunch) {
    async function helper(_previous: GmeStorage.CommitObject,
        current: GmeStorage.CommitObject,
        _ix: number) {

        let original = await getRootCommit(core, project, current._id);
        if (original.root === null) {
            return Promise.reject(`bad original root ${original.root}`);
        }
        let revision = await getRootCommit(core, project, current.parents[0]);

        if (revision.root === null) {
            return Promise.reject(`bad original root ${revision.root}`);
        }
        let diff = await core.generateTreeDiff(original.root, revision.root);

        let km = new KeyedMessage("payload", JSON.stringify(diff));
        let payload = [
            { topic: "topic2", messages: ["oi", "world", km], partition: 0 }
        ];
        return sender(payload)
            .then((data: any) => {
                console.log(`sucessfully sent the data ${data}`);
            })
            .catch((err: Error) => {
                console.log(`failed sending the payload because ${err}`);
            });
    }
    for (let ix = 1; ix < collection.length; ++ix) {
        try {
            await helper(collection[ix - 1], collection[ix], ix);
        } catch (err) {
            console.log(`problem with commit ${ix}`);
        }
    }
}

/**
 * wrap the... 
 * Project.loadObject(key: string, cb: GmeCommon.LoadObjectCallback): void;
 * ...method in an async promise.
 * type LoadObjectCallback = GmeCommon.ResultCallback<GmeStorage.CommitObject | Core.DataObject>;
 * 
 */
function loadObjectAsync(project: GmeClasses.Project,
    commit: GmeStorage.CommitHash): Promise<GmeCommon.LoadObject> {
    return new Promise<GmeCommon.LoadObject>((resolve, reject) => {
        project.loadObject(commit,
            (err: Error, lo: GmeCommon.LoadObject) => {
                if (err !== null) {
                    reject(`null load object for ${commit}`);
                } else {
                    console.log(`load object key ${commit}`);
                    resolve(lo);
                }
            });
    });
}
function loadRootAsync(core: GmeClasses.Core,
    commit: GmeStorage.CommitHash) {
    return new Promise<Core.DataObject>((resolve, reject) => {
        core.loadRoot(commit,
            (err: Error, result: Core.DataObject): void => {
                if (err !== null) {
                    reject(`null load root for ${commit}`);
                } else {
                    console.log(`load root key ${commit}`);
                    resolve(result);
                }
            });
    });
}
/**
 * Return the result-tree associated with a particular commit.
 */
async function loadCommit(core: GmeClasses.Core,
    project: GmeClasses.Project,
    commit: GmeCommon.MetadataHash,
    branch: GmeCommon.Name): Promise<ResultTree> {
    try {
        let commitObj = await loadObjectAsync(project, commit);
        console.log(`load commit ${commitObj}`);
        let root = await loadRootAsync(core, commitObj.root);
        return new ResultTree(root, branch, commit);
    } catch (err) {
        console.log(`load commit failed: ${err}`);
    }
    return new ResultTree(null, "", "");
}

/**
 * Typically the key is simply a commit but if a 
 * branch name is supplied the head commit is looked up first.
 */
async function getRootCommit(
    core: GmeClasses.Core,
    project: GmeClasses.Project,
    commit: GmeStorage.CommitHash) {

    if (GmeRegExp.HASH.test(commit)) {
        return await loadCommit(core, project, commit, "");
    }
    // the seminal case is to load the latest commit of a branch
    let branches = await project.getBranches();
    if (!branches[commit]) {
        return Promise.reject(
            new Error(`there is no branch ${commit}`));
    }
    return await loadCommit(core, project, branches[commit], commit);
}

/**
   * Candidates for building patches:
   * ./webgme/src/common/util/jsonPatcher.js
   * ./webgme/src/common/storage/util.js 
   *   * getPatchObject()
   * ./webgme/src/common/storage/storageclasses/editorstorage.js
   *   * makeCommit()
   * 
   * 
   * @see http://tools.ietf.org/html/rfc6902
   */
function processCommits(config: any,
    core: GmeClasses.Core, project: GmeClasses.Project, sender: Sender) {
    /**
     * Get the most recent commit id.
     */
    let lastKnownCommit = "";

    /**
     * Push the commits into a KeyedMessage.
     * These are only those more recent commits.
     */
    let branch = config["branch"];

    return getCommits(project, branch, lastKnownCommit)
        .then((commitCollection) => {
            commitCollection.sort(
                (lhs: GmeStorage.CommitObject,
                    rhs: GmeStorage.CommitObject): number => {
                    if (lhs.time < rhs.time) { return -1; }
                    if (lhs.time > rhs.time) { return +1; }
                    return 0;
                });
            return deliverCommits(core, project,
                sender, commitCollection);
        });
}

function dummySender(_config: any): Promise<Sender> {
    return new Promise<Sender>((resolve) => {
        resolve((req: Array<ProduceRequest>): Promise<any> => {
            console.log(`the request ${req}`);
            return Promise.resolve("dummy");
        });
    });
}

/**
 * Make a sender for a kafka stream.
 */
async function kafkaSender(configDictionary: any): Promise<Sender> {

    let connStr = configDictionary["deliveryUrl"];
    let client = await new Client(connStr, "kafka-node-client");

    let producer = new Producer(client);

    producer.on("error", () => {
        return Promise.reject(new Error("no payload produced"));
    });

    await producer.on("ready", () => {
        return new Promise((resolve, _reject) => {
            resolve();
        });
    });

    /**
     * promisify producer.send
     */
    return (payloads) => {
        return new Promise((resolve, reject) => {
            producer.send(payloads, (err, data) => {
                if (err === null) {
                    resolve(data);
                } else {
                    reject(err);
                }
            });
        });
    };
}


class StreamPlugin extends PluginBase {

    pluginMetadata: any;

    configDictionary: any;
    project: GmeClasses.Project;

    constructor() {
        super();
        this.pluginMetadata = JSON.parse(MetaDataStr);
    }


    /**
    * Main function for the plugin to execute. This will perform the execution.
    * Notes:
    * - Always log with the provided logger.[error,warning,info,debug].
    * - Do NOT put any user interaction logic UI, etc. inside this method.
    * - callback always has to be called even if error happened.
    *
    * @param {Core.Callback} mainHandler [description]
    */
    public async  main(mainHandler: GmeCommon.ResultCallback<GmeClasses.Result>) {
        let config = this.getCurrentConfig();
        if (config === null) {
            this.sendNotification("The streaming plugin has failed: no configuration");
            mainHandler(null, this.result);
        }
        this.sendNotification(`The streaming plugin is running: ${new Date(Date.now()).toTimeString()}`);
        this.configDictionary = config;
        // let core = this.core;
        this.project = this.project;

        let sender: Sender;
        /**
        * Select delivery mechanism.
        */
        switch (this.configDictionary["deliveryType"]) {
            case "kafka:001":
                sender = await kafkaSender(this.configDictionary);
                break;
            default:
                sender = await dummySender(this.configDictionary);
        }
        /**
         * publish the latest commits.
         */
        await processCommits(this.configDictionary,
            this.core, this.project, sender);

        mainHandler(null, this.result);
    }
}

export = StreamPlugin;
