
/**
 * node_modules/webgme/src/common/storage/constants.js
 * https://github.com/webgme/webgme/blob/master/src/common/storage/constants.js
 */

/**
 *  Unique SHA-1 hash for commit object.
 * @example
 * '#5496cf226542fcceccf89056f0d27564abc88c99'
 */
export type CommitHash = string;

/**
 * @prop {module:Storage~CommitHash} hash - The commitHash for the commit.
 * @prop {string} status - 'SYNCED', 'FORKED', 'CANCELED', undefined
 *
 * @example
 * {
 *   status: 'SYNCED',
 *   hash: '#someHash'
 * }
 * @example
 * {
 *   hash: '<hash from makeCommit with no branch provided>'
 * }
 */
export interface CommitResult {
    status?: string | undefined;
    hash: CommitHash;
}

/**
 * @typedef {object} CommitObject
 * @prop {module:Storage~CommitHash} _id - Hash of the commit object, a.k.a commitHash.
 * @prop {module:Core~ObjectHash} root - Hash of the associated root object, a.k.a. rootHash.
 * @prop {module:Storage~CommitHash[]} parents - Commits from where this commit evolved.
 * @prop {number} time - When the commit object was created (new Date()).getTime().
 * @prop {string} message - Commit message.
 * @prop {string[]} updater - Commit message.
 * @prop {string} type - 'commit'
 *
 * @example
 * {
 *   _id: '#5496cf226542fcceccf89056f0d27564abc88c99',
 *   root: '#04009ecd1e68117cd3e9d39c87aadd9ed1ee5cb3',
 *   parents: ['#87d9fd309ec6a5d84776d7731ce1f1ab2790aac2']
 *   updater: ['guest'],
 *   time: 1430169614741,
 *   message: "createChildren({\"/1008889918/1998840078\":\"/1182870936/737997118/1736829087/1966323860\"})",
 *   type: 'commit'
 * }
 */
export interface CommitObject {
    _id?: CommitHash;
    root: CommitHash;
    parents: CommitHash[];
    updater: string[];
    time: number;
    message: string;
    type: string;
}

/**
 * @typedef {object} PatchObject
 * @prop {module:Core~ObjectHash} _id - Hash of the expected result object.
 * @prop {module:Core~ObjectHash} base - Hash of the base object where the patch should be applied.
 * @prop {string} type - 'patch'.
 * @prop {object} patch - The patch instructions (based on [RFC6902]{@link http://tools.ietf.org/html/rfc6902}).
 *
 * @example
 * {
 *   _id: '#5496cf226542fcceccf89056f0d27564abc88c99',
 *   base: '#04009ecd1e68117cd3e9d39c87aadd9ed1ee5cb3',
 *   type: 'patch',
 *   patch: [{op: 'add', path: '/atr/new', value: 'value'}]
 * }
 */
export interface PatchObject {
    _id?: CommitHash;
    base: CommitHash;
    type: string;
    patch: any;
}

export class StorageConstants {
    // Version
    public static readonly VERSION = "1.0.0";
    // Database related
    public static readonly MONGO_ID = "_id";
    public static readonly PROJECT_INFO_ID = "*info*";
    public static readonly EMPTY_PROJECT_DATA = "empty";
    public static readonly PROJECT_ID_SEP = "+";
    public static readonly PROJECT_DISPLAYED_NAME_SEP = "/";

    // Socket IO
    public static readonly DATABASE_ROOM = "database";
    public static readonly ROOM_DIVIDER = "%";
    public static readonly CONNECTED = "CONNECTED";
    public static readonly DISCONNECTED = "DISCONNECTED";
    public static readonly RECONNECTED = "RECONNECTED";
    public static readonly INCOMPATIBLE_CONNECTION = "INCOMPATIBLE_CONNECTION";
    public static readonly CONNECTION_ERROR = "CONNECTION_ERROR";

    // Branch commit status - this is the status returned after setting the hash of a branch
    // The commitData was inserted in the database and the branchHash updated.
    public static readonly SYNCED = "SYNCED";
    // The commitData was inserted in the database; but the branchHash NOT updated.
    public static readonly FORKED = "FORKED";
    // The commitData was never inserted to the database.
    public static readonly CANCELED = "CANCELED";
    // The commit was initially forked; but successfully merged.
    public static readonly MERGED = "MERGED";

    public static BRANCH_STATUS: BranchStatus;

    // Events
    public static readonly JWT_ABOUT_TO_EXPIRE = "JWT_ABOUT_TO_EXPIRE";
    public static readonly JWT_EXPIRED = "JWT_EXPIRED";

    public static readonly PROJECT_DELETED = "PROJECT_DELETED";
    public static readonly PROJECT_CREATED = "PROJECT_CREATED";

    public static readonly BRANCH_DELETED = "BRANCH_DELETED";
    public static readonly BRANCH_CREATED = "BRANCH_CREATED";
    public static readonly BRANCH_HASH_UPDATED = "BRANCH_HASH_UPDATED";
    public static readonly TAG_DELETED = "TAG_DELETED";
    public static readonly TAG_CREATED = "TAG_CREATED";
    public static readonly COMMIT = "COMMIT";

    public static readonly BRANCH_UPDATED = "BRANCH_UPDATED";

    public static readonly NOTIFICATION = "NOTIFICATION";
    // Types of notifications
    public static readonly BRANCH_ROOM_SOCKETS = "BRANCH_ROOM_SOCKETS";
    public static readonly PLUGIN_NOTIFICATION = "PLUGIN_NOTIFICATION";
    public static readonly ADD_ON_NOTIFICATION = "ADD_ON_NOTIFICATION";
    public static readonly CLIENT_STATE_NOTIFICATION = "CLIENT_STATE_NOTIFICATION";
}

export class BranchStatus {
    public static readonly SYNC = "SYNC";
    public static readonly AHEAD_SYNC = "AHEAD_SYNC";
    public static readonly AHEAD_NOT_SYNC = "AHEAD_NOT_SYNC";
    public static readonly PULLING = "PULLING";
    public static readonly MERGING = "MERGING";
    public static readonly ERROR = "ERROR";
}
