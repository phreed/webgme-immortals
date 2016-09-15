
/** 
 * Convert a dash/dot/underscore/space separated string or array.
 * 
 * dromedary : less humps, the first character is lower case.
 * bactrian : more humps, the first character is upper case.
 * 
 * 
 * Based on 
 *  - https://github.com/sindresorhus/camelcase
 *  - https://github.com/SamVerschueren/uppercamelcase
 * 
 *  - https://github.com/ianstormtaylor/to-case
 */

function isLowerCaseChar(ch: string): boolean {
    return (ch.toLowerCase() === ch);
}
/**
 * Insert hyphens where the case change should happen
 */
function preserveCamel(str: string): string {
    let work = str;
    let wasPreviousCharLowerCase = false;
    for (let ix = 0; ix < str.length; ix++) {
        let ch = str.charAt(ix);
        if (wasPreviousCharLowerCase) {
            wasPreviousCharLowerCase = isLowerCaseChar(ch);
            continue;
        }
        if (/[a-zA-Z]/.test(ch)) {
            wasPreviousCharLowerCase = isLowerCaseChar(ch);
            continue;
        }
        if (!isLowerCaseChar(ch)) {
            wasPreviousCharLowerCase = false;
            continue;
        }
        work = work.substr(0, ix) + "-" + work.substr(ix);
        wasPreviousCharLowerCase = false;
        ix++;
    }
    return work;
}

export function bactrian(input: string): string {
    let work = dromedary(input);
    return work.charAt(0).toUpperCase() + work.slice(1);
}

export function dromedary(input: string[] | string): string {
    let work: string;
    if (input instanceof Array) {
        work = input
        .map((str: string): string => { return str.trim(); })
        .filter((str: string): number => { return str.length; })
        .join("-");
    } else {
        work = input;
    }

    if (!work.length) { return ""; }
    if (work.length === 1) { return work.toLowerCase(); }

    if (!(/[_.\- ]+/).test(work)) {
        if (work === work.toUpperCase()) { return work.toLowerCase(); }
        if (isLowerCaseChar(work[0])) { return work; }
        return work[0].toLowerCase() + work.slice(1);
    }

    work = preserveCamel(work);

    return work
        .replace(/^[_.\- ]+/, "")
        .toLowerCase()
        .replace(/[_.\- ]+(\w|$)/g,
            (match: string, p1: string): string => {
                return p1.toUpperCase();
        });
}