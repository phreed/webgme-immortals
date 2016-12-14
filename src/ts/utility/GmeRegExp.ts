
/**
 * This is a reimplementation of...
 * ./webgme/src/common/regexp.js
 * ...in TypeScript.
 */

export namespace GmeRegExp {
    export const HASH = new RegExp("^#[0-9a-zA-Z_]*$");
    export const DB_HASH = new RegExp("^#[0-9a-zA-Z_]{40}$");
    export const BRANCH = new RegExp("^[0-9a-zA-Z_]*$");
    export const TAG = new RegExp("^[0-9a-zA-Z_]*$");
    // This is how it's stored in mongodb, i.e. with a prefixed *.
    export const RAW_BRANCH = new RegExp("^\\*[0-9a-zA-Z_]*$");
    // project name may not start with system. or _
    export const PROJECT = new RegExp("^(?!system\\.)(?!_)[0-9a-zA-Z_+]*$");
    // based on the MongoDB requirements (no '.' and no leading $)
    export const DOCUMENT_KEY = new RegExp("^[^(\$|\_)\.][^\.]*$");
    export const PROJECT_NAME = new RegExp("^[0-9a-zA-Z_]+$");

    export const INVALID_CSS_CHARS = new RegExp("[!\"#$%&'()\*\+,\./:;<=>\?@\[\\\]^`{\|}~ ]+", "g");
    export const HTML_ELEMENT = new RegExp("<[a-z][\\s\\S]*>", "i");
    export const GUID = new RegExp("[a-z0-9]{8}(-[a-z0-9]{4}){3}-[a-z0-9]{12}", "i");
    export const BLOB_HASH = new RegExp("^[0-9a-f]{40}$");
}