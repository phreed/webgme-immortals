
/**
 * This set of constants was lifted from ...
 * ./node_modules/webgme/src/client/js/client/constants.js
 * https://github.com/webgme/webgme/blob/master/src/client/js/client/constants.js
 */
import { StorageConstants, BranchStatus } from "./StorageConstants";
import { CoreConstants } from "./CoreConstants";

export class ClientConstants {

    public static readonly STORAGE: StorageConstants;
    public static readonly CORE: CoreConstants;

    public static readonly BRANCH_STATUS: BranchStatus;

    public static readonly UNCAUGHT_EXCEPTION = "UNCAUGHT_EXCEPTION";

    // Events
    public static readonly NETWORK_STATUS_CHANGED = "NETWORK_STATUS_CHANGED";
    public static readonly BRANCH_STATUS_CHANGED = "BRANCH_STATUS_CHANGED";

    public static readonly BRANCH_CHANGED = "BRANCH_CHANGED";
    public static readonly PROJECT_CLOSED = "PROJECT_CLOSED";
    public static readonly PROJECT_OPENED = "PROJECT_OPENED";

    public static readonly UNDO_AVAILABLE = "UNDO_AVAILABLE";
    public static readonly REDO_AVAILABLE = "REDO_AVAILABLE";

    // general notification event
    public static readonly  NOTIFICATION = "NOTIFICATION";
    public static readonly CONNECTED_USERS_CHANGED = "CONNECTED_USERS_CHANGED";

    // Constraint Checking
    public static readonly META_RULES_RESULT = "META_RULES_RESULT";
    public static readonly CONSTRAINT_RESULT = "CONSTRAINT_RESULT";
};
