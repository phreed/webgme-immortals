
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
// import { exec } from "child_process";
import PluginBase = require("plugin/PluginBase");
import MetaDataStr = require("text!plugins/StreamPlugin/metadata.json");
import { Producer as KafkaProducer, Result as KafkaResult, Message as KafkaMessage, COMPRESSION_NONE } from "no-kafka";
import { GmeRegExp } from "utility/GmeRegExp";

/**
 * The JSON.stringify takes an argument that can be
 * Used to halt unlimited circular dependency descent.
 * There seems to be a harded maximum of 30 serialized objects.
 * At that hard limit an exception is thrown.
 * Using 15 because that seems like it should be enough.
 */
function replacer(root: any, options: { maxLevel?: number, maxNodes?: number }) {
    let visited: Array<any> = [];
    let visitedKeys: Array<any> = [];
    let maxVisits = options.maxLevel ? options.maxLevel : 0;
    return (key: string, value: any) => {
        if (maxVisits > 0 && visited.length > maxVisits) {
            return `xfdf: too many visits`;
        }
        let visitedRef: number = 0;
        let visitedFlag = false;
        visited.forEach((obj: any, ix: number) => {
            if (obj !== value) { return; }
            visitedFlag = true;
            visitedRef = ix;
        });
        // handle root element
        if (key === "") {
            visited.push(root);
            visitedKeys.push("root");
            return value;
        }
        if (visitedFlag && typeof (value) === "object") {
            let seen = visitedKeys[visitedRef];
            if (seen === "root") {
                return `xvdf: pointer to root`;
            }
            if (!!value && !!value.constructor) {
                return `xvdf: see ${value.constructor.name.toLowerCase()} with key ${seen}`;
            }
            return `xvdf: see ${typeof (value)} with key ${seen}`;
        }
        let qualKey = key || `(xvdf: empty key)`;
        visited.push(value);
        visitedKeys.push(qualKey);
        return value;
    };
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


interface Sender {
    (reqs: Array<KafkaMessage>): Promise<KafkaResult[]>;
}

/**
 * generate the commit and send it as indicated by the producer.
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
        // console.log(`deliver commits: ${JSON.stringify(diff)}`);
        return await sender(
            [{
                topic: "darpa.brass.immortals.vu.isis.gme", partition: 0,
                message: { key: "natural diff", value: JSON.stringify(diff) }
            }]);
    }


    /**
    * This function generates a tree diff between pairs of commits.
    */
    async function normalHelper(_previous: GmeStorage.CommitObject,
        current: GmeStorage.CommitObject,
        _ix: number): Promise<KafkaResult[]> {
        // console.log(`normal helper:`);
        // console.log(` ix: ${_ix}, \n`
        //    + `prev: ${JSON.stringify(_previous, replacer(_previous, {}), 2)}, \n`
        //    + `curr: ${JSON.stringify(current, replacer(current, {}), 2)}`);

        let preCommit = await getRootCommit(core, project, current._id);
        if (preCommit.root === null) {
            return Promise.reject(`problem with pre-commit root ${preCommit.root}`);
        }
        // console.log(`pre:`);

        let postCommit = await getRootCommit(core, project, current.parents[0]);
        if (postCommit.root === null) {
            return Promise.reject(`problem with post-commit root ${postCommit.root}`);
        }
        // console.log(`post:`);

        let diff = await core.generateTreeDiff(preCommit.root, postCommit.root);
        // console.log(`diff:`);
        return await sender(
            [{
                topic: "darpa.brass.immortals.vu.isis.gme", partition: 0,
                message: { key: "normal diff", value: JSON.stringify(diff) }
            }]);
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
                    // console.log(`load object key ${commit}`);
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
                    // console.log(`load root key ${commit}`);
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
        // console.log(`get root commit ${commit}`);
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

    let commitCollection: Array<GmeStorage.CommitObject> = [];
    switch (config.grainSize) {
        case "fine":
            break;
        case "coarse":
        default:
            commitCollection = await getCommits(project, branch, lastKnownCommit);
    }
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

async function dummyPublisher(_config: any): Promise<Sender> {
    return async (payloads: KafkaMessage[]): Promise<KafkaResult[]> => {
        return new Promise<KafkaResult[]>((resolve, _reject) => {
            console.log(`dummy: ${JSON.stringify(payloads, replacer(payloads, {}), 2)}`);
            resolve();
        });
    };
};

/**
 * Make a publisher for a kafka stream.
 * This function forms a sender function that delivers payload.
 */
async function kafkaPublisher(configDictionary: any): Promise<Sender> {
    let connStr = configDictionary["deliveryUrl"];
    console.log(`connecting to: ${connStr}`);
    let producer = new KafkaProducer({
        connectionString: connStr,
        clientId: "producer",
        codec: COMPRESSION_NONE
    });
    await producer.init();

    return async (payloads: KafkaMessage[]): Promise<KafkaResult[]> => {
        return await producer.send(payloads);
    };
}

/**
 * The class
 */
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
    public async main(mainHandler: GmeCommon.ResultCallback<GmeClasses.Result>) {
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
                console.log(`making a kafka sender`);
                sender = await kafkaPublisher(this.configDictionary);
                break;
            default:
                console.log(`making a dummy sender`);
                sender = await dummyPublisher(this.configDictionary);
        }
        /**
         * publish the latest commits.
         */
        try {
            await processCommits(this.configDictionary,
                this.core, this.project, sender);
            this.result.setSuccess(true);

            console.log(`processing complete`);
            mainHandler(null, this.result);
        } catch (err) {
            console.log(`processing failed`);
            mainHandler(err, this.result);
        }
    }
}

export = StreamPlugin;
