


import { PruningFlag } from "serializer/filters";

export type GuidType = string;

export function isFaultType(arg: any): arg is FaultType {
    if (arg.fault === undefined) { return false; }
    return true;
}
export interface FaultType {
    fault: string;
};

export function isNGuidType(arg: any): arg is NGuidType {
    if (arg.name === undefined) { return false; }
    if (arg.guid === undefined) { return false; }
    return true;
}
export interface NGuidType {
    name: string;
    guid: GuidType;
};

/** 
 * Sets are kind of like pointers but 
 * with many rather than just one.
 */
export interface Pointers {
    [key: string]: NGuidType;
};

export interface Sets {
    [kind: string]: (FaultType | NGuidType)[];
};

export interface TypeType {
    domain: string;
    meta: string;
    root: string;
    base: string;
    parent: string;
    name?: string;
};

export interface NameType {
    name: string;
    uriExt: string;
    uriPrefix: string;
    uriName: string;
    uriGen: string;
};

export interface Subject {
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