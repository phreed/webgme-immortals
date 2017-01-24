


import { PruningFlag } from "serializer/filters";

export type GuidType = string;

export const BLANK = "";
export const NULL_NAME = "NULL";
export const NULL_OBJECT = "_OBJECT";
export const NULL_GUID = "00000000-0000-0000-0000-000000000000";

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

export class TypeType {
    domain: string;
    meta: string;
    root: string;
    base: string;
    parent: string;
    name?: string;

    constructor(domain: string, meta: string, root: string,
        base: string, parent: string, name: string | undefined) {
        this.domain = domain;
        this.meta = meta;
        this.root = root;
        this.base = base;
        this.parent = parent;
        this.name = name;
    }
    static makeEmpty(): TypeType {
        return new TypeType(BLANK, NULL_NAME, NULL_NAME, NULL_NAME, NULL_NAME, undefined);
    }
    static makeDomain(languageName: string): TypeType {
        return new TypeType(languageName, NULL_GUID, NULL_GUID, NULL_GUID, NULL_GUID, undefined);
    }
}

export class NameType {
    name: string;
    uriGen: string;
    uriPrefix: string;
    uriName: string;
    uriExt: string;

    constructor(name: string,
        uriGen: string,
        uriPrefix: string,
        uriName: string,
        uriExt: string) {
        this.name = name;
        this.uriGen = uriGen;
        this.uriPrefix = uriPrefix;
        this.uriName = uriName;
        this.uriExt = uriExt;
    }
    static makeEmpty() {
        return new NameType(NULL_OBJECT, BLANK, BLANK,
            BLANK, BLANK);
    }
}

export class Subject {

    version: string;
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

    constructor(
        version: string,
        guid: string,
        name: NameType,
        type: TypeType,
        pointers: Pointers,
        inv_pointers: Pointers,
        sets: Sets,
        inv_sets: Sets,
        base: NGuidType,
        attributes: { [attr: string]: string | number },
        children: { [type: string]: GuidType[] },
        prune: PruningFlag) {

        this.version = version;
        this.guid = guid;
        this.name = name;
        this.type = type;
        this.pointers = pointers;
        this.inv_pointers = inv_pointers;
        this.sets = sets;
        this.inv_sets = inv_sets;
        this.base = base;
        this.attributes = attributes;
        this.children = children;
        this.prune = prune;
    }

    static makeIdentity(guid: string) {
        return new Subject(
            "0.0.1",
            guid,
            NameType.makeEmpty(),
            TypeType.makeEmpty(),
            {}, {},
            {}, {},
            {
                "name": NULL_OBJECT,
                "guid": NULL_GUID
            },
            {},
            {},
            PruningFlag.None
        );
    }

    static makeRoot(languageName: string): Subject {
        return new Subject(
            "0.0.1",
            NULL_GUID,
            NameType.makeEmpty(),
            TypeType.makeDomain(languageName),
            {}, {},
            {}, {},
            {
                "name": NULL_OBJECT,
                "guid": NULL_GUID,
            },
            {},
            {},
            PruningFlag.None
        );

    }
}