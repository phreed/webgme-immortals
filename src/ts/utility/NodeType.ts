/**
 * As the nodes are extracted from the GME model nodes are formed.
 */
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

export interface PointersArray {
    [key: string]: [NGuidType];
}

export interface Sets {
    [kind: string]: (FaultType | NGuidType)[];
}

export class TypeType {
    domain: string;
    meta: string;
    isMeta: boolean;
    root: string;
    base: string;
    parent: string;
    name?: string;

    static brief(that: TypeType): string {
        if (typeof that === "undefined") {
            return "undef";
        }
        return `[D]${that.domain} [M]${that.meta} [R]${that.root} [B]${that.base} [P]${that.parent}`;
    }

    constructor(domain: string, meta: string, root: string,
        base: string, parent: string, name: string | undefined) {
        this.domain = domain;
        this.meta = meta;
        this.root = root;
        this.base = base;
        this.parent = parent;
        this.name = name;
    }
    static makeByHash(hash: { [key: string]: any }) {
        return new TypeType(hash["domain"],
            hash["meta"], hash["root"], hash["base"], hash["parent"], hash["name"]);
    }
    static makeEmpty(): TypeType {
        return new TypeType(BLANK, NULL_NAME, NULL_NAME, NULL_NAME, NULL_NAME, undefined);
    }
    static makeDomain(languageName: string): TypeType {
        return new TypeType(languageName, NULL_GUID, NULL_GUID, NULL_GUID, NULL_GUID, undefined);
    }
}

/**
 * Makes reference to objects that are included, propagated, in the output.
 * These flags indicate under what conditions objects may be filtered.
 *
 * preserve : by default classes are *not* preserved in the output this
 *    flag indicates that they should be preserved in that output.
 * supress : by default instances *are* preserved in the output this
 *    flag indicates that they should not be so preserved.
 */
export type PropagationType = "preserve" | "suppress" | null;

export function makePropagation(val: string | null): PropagationType {
    switch (val) {
        case "preserve": return "preserve";
        case "supress": return "suppress";
        default: return null;
    }
}

export class NameType {
    name: string;
    epoch: string | null;
    propagation: PropagationType;
    extUuid: string;
    uriGen: string;
    uriPrefix: string;
    uriExt: string;
    uriName: string;

    static brief(that: NameType): string {
        if (typeof that === "undefined") {
            return "undef";
        }
        return `[A]${that.name} [G]${that.uriGen} [P]${that.uriPrefix} [X]${that.uriExt} [N]${that.uriName} [U]${that.extUuid}`;
    }

    constructor(
        name: string,
        propagation: PropagationType,
        epoch: string,
        extUuid: string,

        uriGen: string,
        uriPrefix: string,
        uriExt: string,
        uriName: string) {

        this.name = name;
        this.propagation = propagation;
        this.epoch = epoch;
        this.extUuid = extUuid;
        this.uriGen = uriGen;
        this.uriPrefix = uriPrefix;
        this.uriName = uriName;
        this.uriExt = uriExt;
    }
    static makeEmpty() {
        return new NameType(NULL_OBJECT, null, BLANK, BLANK, BLANK, BLANK,
            BLANK, BLANK);
    }
    static makeByHash(hash: { [key: string]: any }) {
        return new NameType(hash["name"], hash["preserve"], hash["epoch"], hash["extUuid"],
            hash["uriGen"], hash["uriPrefix"], hash["uriExt"], hash["uriName"]);
    }

}

export type ChildReasonType = { [type: string]: { [guid: string]: { parent: GuidType, child: GuidType } } };
export class Subject {

    version: string;
    guid: string;
    name: NameType;
    type: TypeType;
    pointers: Pointers;
    inv_pointers: PointersArray;
    sets: Sets;
    inv_sets: Sets;
    base: NGuidType;
    attributes: { [attr: string]: string | number };
    children: ChildReasonType;
    prune: PruningFlag;

    static brief(that: Subject): string {
        if (typeof that === "undefined") {
            return "undef";
        }
        return `
         version: ${that.version}
         guid: ${that.guid}
         name: ${NameType.brief(that.name)},
         type: ${TypeType.brief(that.type)}`;
    }

    constructor(
        version: string,
        guid: string,
        name: NameType,
        type: TypeType,
        pointers: Pointers,
        inv_pointers: PointersArray,
        sets: Sets,
        inv_sets: Sets,
        base: NGuidType,
        attributes: { [attr: string]: string | number },
        children: ChildReasonType,
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

    static makeByHash(hash: { [key: string]: any }) {
        return new Subject(hash["version"],
            hash["guid"],
            hash["name"], hash["type"],
            hash["pointers"], hash["inv_pointers"],
            hash["sets"], hash["inv_sets"],
            hash["base"], hash["attributes"],
            hash["children"], hash["prune"]);
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