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

/**
 * The JSON.stringify takes an argument that can be 
 * Used to halt unlimited circular dependency descent.
 * There seems to be a harded maximum of 30 serialized objects.
 * At that hard limit an exception is thrown.
 * Using 15 because that seems like it should be enough.
 */
/*
function areplacer(censoredValue: any) {
    let ix = -1;
    return (key: string, value: any) => {
        ++ix;
        if (ix === 0) {
            console.log(`priming ${censoredValue}`);
            return value;
        }
        if (ix > 15) {
            return `[Exausted] ${ix}`;
        }
        if (typeof (censoredValue) !== "object") {
            console.log(`censored value is not object`);
            return value;
        }
        if (typeof (value) !== "object") {
            console.log(`value is not object: [[${key}:${value}]]`);
            return value;
        }
        if (censoredValue != value) {
            console.log(`not censored: [[${key}]]`);
            return value;
        }
        return `[Circular:${ix}]`;
    }
}
*/

function replacer(root: any, options: { maxLevel?: number, maxNodes?: number }) {
    let visited: Array<any> = [];
    let visitedKeys: Array<any> = [];
    let maxVisits = options.maxLevel ? options.maxLevel : 0;
    return (key: string, value: any) => {
        if (maxVisits > 0 && visited.length > maxVisits) {
            return `too many visits`;
        }
        let visitedRef: number = 0;
        let visitedFlag = false;
        visited.forEach((obj: any, ix: number) => {
            if (obj !== value) return;
            visitedFlag = true;
            visitedRef = ix;
        });
        // handle root element
        if (key == "") {
            visited.push(root);
            visitedKeys.push("root");
            return value;
        }
        if (visitedFlag && typeof (value) == "object") {
            let seen = visitedKeys[visitedRef];
            if (seen == "root") {
                return `pointer to root`;
            }
            if (!!value && !!value.constructor) {
                return `see ${value.constructor.name.toLowerCase()} with key ${seen}`;
            }
            return `see ${typeof (value)} with key ${seen}`;
        }
        let qualKey = key || `(empty key)`;
        visited.push(value);
        visitedKeys.push(qualKey);
        return value;
    }
}

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

/**
 * if the termination-point is null then include the
 * last commit retrieved as an initial project commit.
 * [get-history returns commits in anti-chronological order
 * so the last commit is the initial project commit.]
 */
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

/**
 * generate the commit and send it as indicated by the sender.
 */
async function deliverCommits(
    core: GmeClasses.Core, project: GmeClasses.Project,
    sender: Sender, collection: CommitBunch): Promise<void> {

    async function naturalHelper(prime: GmeStorage.CommitObject) {
        let nullCommit = core.createNode({});
        if (nullCommit instanceof Error) {
            return Promise.reject(`null root: failure`);
        }

        let postCommit = await getRootCommit(core, project, prime._id);
        if (postCommit.root === null) {
            return Promise.reject(`primary root: ${prime._id}`);
        }

        let diff = await core.generateTreeDiff(nullCommit, postCommit.root);
        let payload = [
            {
                topic: "urn:vu-isis:gme/brass/immortals",
                project: project.projectId,
                commit: prime,
                messages: new KeyedMessage("payload", diff),
                partition: 0
            }
        ];
        return await sender(payload);
    }


    /**
    * This function generates a tree diff between pairs of commits.
    */
    async function normalHelper(_previous: GmeStorage.CommitObject,
        current: GmeStorage.CommitObject,
        _ix: number): Promise<void> {
        console.log(`normal helper:`);
        console.log(` ix: ${_ix}, \n`
            + `prev: ${JSON.stringify(_previous, replacer(_previous, {}), 2)}, \n`
            + `curr: ${JSON.stringify(current, replacer(current, {}), 2)}`);

        let preCommit = await getRootCommit(core, project, current._id);
        if (preCommit.root === null) {
            return Promise.reject(`problem with pre-commit root ${preCommit.root}`);
        }
        // console.log(`pre: ${JSON.stringify(preCommit, replacer(preCommit), 2)}`);

        let postCommit = await getRootCommit(core, project, current.parents[0]);
        if (postCommit.root === null) {
            return Promise.reject(`problem with post-commit root ${postCommit.root}`);
        }
        // console.log(`post: ${JSON.stringify(postCommit, replacer(postCommit), 2)}`);

        let diff = await core.generateTreeDiff(preCommit.root, postCommit.root);
        // console.log(`diff: ${JSON.stringify(diff, replacer(diff, {}), 2)}`);
        let payload = [
            {
                topic: "urn:vu-isis:gme/brass/immortals",
                project: project.projectId,
                commit: current,
                messages: new KeyedMessage("payload", diff),
                partition: 0
            }
        ];
        return await sender(payload);
    }

    // processing
    if (collection.length > 0) {
        try {
            await naturalHelper(collection[0]);
        } catch (err) {
            console.log(`natural helper failed [[${err}]]`);
            console.log(`failed commit: ${JSON.stringify(collection[0], replacer(collection[0], {}), 2)}`);
        }

        for (let ix = 1; ix < collection.length; ++ix) {
            try {
                console.log(`preparing to run normal helper`);
                await normalHelper(collection[ix - 1], collection[ix], ix);
            } catch (err) {
                console.log(`normal helper failed [[${ix}: ${err}]]`);
                console.log(`failed commit: ${JSON.stringify(collection[ix], replacer(collection[ix], {}), 2)}`);
            }
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
    commit: GmeStorage.CommitHash): Promise<Core.DataObject> {
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
        let root = await loadRootAsync(core, commitObj.root);
        let tree = new ResultTree(root, branch, commit);
        // console.log(`commit loaded ${JSON.stringify(tree, replacer(tree, {}), 2)}`);
        return tree;
    } catch (err) {
        console.log(`load failure [[${err}: ${commit}]]`);
    }
    return new ResultTree(null, "broken", commit);
}

/**
 * Typically the key is simply a commit but if a 
 * branch name is supplied the head commit is looked up first.
 */
async function getRootCommit(
    core: GmeClasses.Core,
    project: GmeClasses.Project,
    commit: GmeStorage.CommitHash): Promise<ResultTree> {

    if (GmeRegExp.HASH.test(commit)) {
        console.log(`get root commit ${commit}`);
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
async function processCommits(config: any,
    core: GmeClasses.Core, project: GmeClasses.Project, sender: Sender): Promise<void> {
    /**
     * Get the most recent commit id.
     */
    let lastKnownCommit = "";

    /**
     * Push the commits into a KeyedMessage.
     * These are only those more recent commits.
     */
    let branch = config["branch"];

    let commitCollection = await getCommits(project, branch, lastKnownCommit);
    commitCollection.sort(
        (lhs: GmeStorage.CommitObject,
            rhs: GmeStorage.CommitObject): number => {
            if (lhs.time < rhs.time) { return -1; }
            if (lhs.time > rhs.time) { return +1; }
            return 0;
        });
    return deliverCommits(core, project,
        sender, commitCollection);

}

function dummySender(_config: any): Promise<Sender> {
    return new Promise<Sender>((resolve) => {
        resolve((req: Array<ProduceRequest>): Promise<any> => {
            console.log(`the request ${JSON.stringify(req, replacer(req, {}), 2)}`);
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
        try {
            await processCommits(this.configDictionary,
                this.core, this.project, sender);

            console.log(`processing complete`);
            mainHandler(null, this.result);
        } catch (err) {
            console.log(`processing failed`);
            mainHandler(err, this.result);
        }
    }
}

export = StreamPlugin;
