


import { PruningFlag } from "serializer/filters";

export type GuidType = string;

export function isFaultType(arg: any): arg is FaultType {
    if (arg.fault === undefined) { return false; }
    return true;
}
export interface FaultType {
    fault: string;
}

export function isNGuidType(arg: any): arg is NGuidType {
    if (arg.name === undefined) { return false; }
    if (arg.guid === undefined) { return false; }
    return true;
}
export class NGuidType {
    constructor(name: string, guid: string) {
        this.name = name;
        this.guid = guid;
    }
    name: string;
    guid: GuidType;
}

/** 
 * Sets are kind of like pointers but 
 * with many rather than just one.
 */
export interface Pointers {
    [key: string]: NGuidType;
}

export interface Sets {
    [kind: string]: (FaultType | NGuidType)[];
}

export interface TypeType {
    domain: string;
    meta: string;
    root: string;
    base: string;
    parent: string;
    name?: string;
}

export class NameType {
    constructor(name: string) {
        this.name = name;
    }
    name: string;
    uriGen: string;
    uriPrefix: string;
    uriName: string;
    uriExt: string;
}

export class Subject {
    constructor(guid: string) {
        this.guid = guid;
    }
    guid: string;
    name: NameType;
    type: TypeType;
    pointers: Pointers;
    inv_pointers: Pointers;
    sets: Sets;
    inv_sets: Sets;
    base: NGuidType;
    attributes: { [attr: string]: string | number };
    children: { [type: string]: GuidType[] };
    prune: PruningFlag;
    version?: string;
}