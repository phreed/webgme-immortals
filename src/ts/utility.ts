/**
 * A set of utilities that are difficult to write in typescript.
 * @type {[type]}
 *
 * http://stackoverflow.com/questions/4224606/how-to-check-whether-a-script-is-running-under-node-js
 */
export function amRunningOnServer() {
    if (typeof module === 'undefined') {
        return false;
    }
    if (!module.exports) {
        return false;
    }
    if (typeof window !== 'undefined') {
        return false;
    }
    return true;
}
