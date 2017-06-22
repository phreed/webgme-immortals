

// import { loadConfigurationFromPath } from 'tslint/lib/configuration';
import PluginBase = require("plugin/PluginBase");
import { NULL_GUID } from "../utility/NodeType";

import _ = require("underscore");
import { Writer, N3Writer, Util } from "n3";
import * as nlv from "serializer/NodeListVisitor";
import * as acase from "utility/altCase";
import { PruningCondition } from "serializer/filters";
import * as nt from "utility/NodeType";


const BLANK = "";
const NA = "NA";

const NS_owl = "http://www.w3.org/2002/07/owl";
const NS_xsd = "http://www.w3.org/2001/XMLSchema";
const NS_rdfs = "http://www.w3.org/2000/01/rdf-schema";
const NS_rdf = "http://www.w3.org/1999/02/22-rdf-syntax-ns";

const NS0 = "http://darpa.mil/immortals/ontology";
// const NS1 = `${NS0}/r1.0.0`;
const NS2 = `${NS0}/r2.0.0`;
// const NS2_ex = `${NS2}com/securboration/immortals/example`;

/**
 * [writeRdfTtlString description]
 * @param  {Core.Dictionary | void} attr [description]
 * @return {string}                          [description]
 */


interface FnGuid {
    (raw: string, guid: string): string;
}

const appendGuid: FnGuid = (raw: string, guid: string): string => {
    return `${raw}-${guid}`;
};

const noGuid: FnGuid = (raw: string, _guid: string): string => {
    return raw;
};

function setDefault(value: string, fault: string): string {
    if (typeof value === undefined) { return fault; }
    if (value === "") { return fault; }
    return value;
}

function objectifyName(nodeName: nt.NameType): string {
    // this.context.logger.info("objectify name: ");
    return setDefault(nodeName.name, NA);
}

/**
 * This function determines the type of an object.
 */
function objectifyType(nodeType: nt.TypeType, dict: Map<string, nt.Subject>): string {
    // this.context.logger.info("objectify type: ");
    if (nodeType === undefined) {
        return `${NS2}/cp#undefined`;
    }
    if ("name" in nodeType) {
        return `${NS2}/cp#${nodeType.name}`;
    }
    // let domain = setDefault(nodeType.domain, NA);
    let metaNode = setDefault(nodeType.meta, NA);
    // let rootNode = setDefault(nodeType.root, NA);
    // let baseNode = setDefault(nodeType.base, NA);

    return objectifyByGuid(metaNode, dict);
}

function objectifyBase(nodeBase: nt.NGuidType, dict: Map<string, nt.Subject>): string {
    let guid = nodeBase.guid;
    // this.context.logger.info(`objectify base: ${guid}`);
    return objectifyByGuid(guid, dict);
}

function objectifyPointer(nodePointer: nt.NGuidType, dict: Map<string, nt.Subject>): string {
    let guid = nodePointer.guid;
    // this.context.logger.info(`objectify pointer: ${guid}`);
    return objectifyByGuid(guid, dict);
}

function objectifyByGuid(nodeGuid: string, dict: Map<string, nt.Subject>): string {
    // this.context.logger.info(`object by guid: ${nodeGuid}`);
    let node = dict.get(nodeGuid);
    if (typeof node === "undefined") {
        return NULL_GUID;
    }
    let fnGuid: FnGuid = isClass(dict, node) ? noGuid : appendGuid;
    return getRdfNameForNode(node, fnGuid, acase.bactrian);
}

function predicateContainsKey(key: string): string {
    // this.context.logger.info(`predicate contains key: ${key}`);
    return `${NS2}#has${acase.bactrian(acase.cookName(key))}`;
}

function predicateIndicatesKey(key: string): string {
    // this.context.logger.info(`predicate contains key: ${key}`);
    return `${NS2}#has${acase.bactrian(acase.cookName(key))}`;
}

/**
 * Generate a predicate based on the reason for the containment.
 */
function predicateByContainment(_subject: nt.Subject | undefined, objective: nt.Subject | undefined): string {
    if (typeof objective === "undefined") {
        return `${NS2}#hasUndefined}`;
    }
    let candidate = objective.name.uriName;
    candidate = (candidate) ? candidate : objective.name.name;
    return `${NS2}#has${acase.bactrian(acase.cookName(candidate))}`;
}

function isFilled(name: string | null | undefined) {
    if (name === null) { return false; }
    if (name === undefined) { return false; }
    if (name.length < 1) { return false; }
    return true;
}

/**
 * Construct the RDF subject name from parts.
 */
function buildSemanticUriForNode(name: nt.NameType, conditioner: (raw: string) => string): string {
    let uriPrefix: string = setDefault(name.uriPrefix, BLANK);
    let uriExt: string = setDefault(name.uriExt, BLANK);
    let uriName: string = setDefault(name.uriName, BLANK);
    let nickName: string = conditioner(setDefault(name.name, BLANK));
    if (uriPrefix.slice(-1) === "/") {
        // this.context.logger.info("your uriPrefix has a trailing slash (/) you should remove it");
        uriPrefix = uriPrefix.slice(0, -1);
    }
    if (uriExt.slice(-1) === "/") {
        // this.context.logger.info("your uriExt has a trailing slash (/) you should remove it");
        uriExt = uriExt.slice(0, -1);
    }
    if (uriExt.slice(-1) === "#") {
        // this.context.logger.info("your uriExt has a trailing octathorp (#) you should remove it");
        uriExt = uriExt.slice(0, -1);
    }

    if (isFilled(uriName)) {
        return `${uriPrefix}/${uriExt}#${uriName}`;
    } else if (isFilled(nickName)) {
        return `${uriPrefix}/${uriExt}#${acase.cookName(nickName)}`;
    } else {
        return `${uriPrefix}${uriExt}#missing`;
    }
}


function buildRawUriForNode(name: nt.NameType, conditioner: (raw: string) => string): string {
    let nickName: string = conditioner(setDefault(name.name, "no-raw-name"));
    return `${nickName}`;
}

function buildNoneUriForNode(name: nt.NameType, conditioner: (raw: string) => string): string {
    let nickName: string = conditioner(setDefault(name.name, "no-name"));

    return `${NS2}/model#${acase.cookName(nickName)}`;
}

/**
 * Construct an RDF name for the node.
 * This is of the form...
 * "http://somthing/else#and-guid"
 * Where the guid element is left off in some cases.
 */
function getRdfNameForNode(node: nt.Subject,
    guidFn: (raw: string, guid: string) => string,
    conditioner: (raw: string) => string): string {

    let guid = setDefault(node.guid, "00000-01");
    // this.context.logger.info(`write node having gid: ${guid}`);
    let nameDict = node.name;
    let uriGen = setDefault(nameDict.uriGen, "none");
    // this.context.logger.info(`uri generator: ${uriGen}`);
    switch (uriGen) {
        case "semantic":
            return guidFn(buildSemanticUriForNode(nameDict, conditioner), guid);
        case "raw":
            return guidFn(buildRawUriForNode(nameDict, conditioner), guid);
        case undefined:
        case null:
        case "none":
            if (nameDict !== undefined) {
                return guidFn(buildNoneUriForNode(nameDict, conditioner), guid);
            }
            return `${NS2}#unknown`;
        default:
            return `${NS2}#unknown`;
    }
}


/**
 * A function to determine if a node is an atom.
 *
 * atom => a node with no pointers, and attributes
 * The predicate for a contained atom is constructed from
 * the name of the atom plus the names of its attributes.
 * There will be one triple for each attribute.
 * When traversing the tree an atom has no subject so
 * it produces no triples of its own.
 */
function isAtom(node: nt.Subject): boolean {
    if (isModel(node)) { return false; }

    if (isConnection(node)) { return false; }
    if (!_.isEmpty(node.inv_pointers)) { return false; }

    if (isCollection(node)) { return false; }
    if (!_.isEmpty(node.inv_sets)) { return false; }
    return true;
}

/**
* model => a node with children
* If a child is an "atom" then its attributes are rendered
* as triples where the model is the subject.
* Children that are not atoms are treated as objects.
*/
function isModel(node: any): boolean {
    if (_.isEmpty(node.children)) { return false; }
    return true;
}

/**
 * connection => a node with pointers
 */
function isConnection(node: any): boolean {
    if (_.isEmpty(node.pointers)) { return false; }
    return true;
}

/**
 * The node is a set if it points to sets.
 */
function isCollection(node: nt.Subject): boolean {
    if (_.isEmpty(node.sets)) { return false; }
    return true;
}


/**
 * If the node is a 'meta' node then it describes a class.
 * What does it mean to be a 'meta' node?
 * If the base of the node and its meta are the same
 * then the node describes the class.
 *
 * If an object has a different epoch than its base then
 * it is a sub-class of that base, i.e. it is a class.
 */
function isClass(nodeDict: Map<string, nt.Subject>, node: nt.Subject): boolean {
    if (node === undefined) { return false; }

    if (node.type.isMeta) { return true; }

    let parent = nodeDict.get(node.base.guid);
    if (typeof parent !== "undefined") {
        if (node.name.epoch !== parent.name.epoch) { return true; }
    }
    return false;
}


/**
 * A class for functors which serialize a node.
 */
export class RdfNodeSerializer {

    private pruningCondition: PruningCondition;
    private writer: N3Writer;
    public ttlStr: string = "none produced";
    private context: PluginBase;
    private nodeDict: Map<string, nt.Subject>;

    constructor(context: PluginBase, dict: Map<string, nt.Subject>, pruningCondition: PruningCondition) {
        this.context = context;
        this.nodeDict = dict;
        let subject = nt.Subject.makeIdentity(NA);
        subject.name = nt.NameType.makeByHash({
            "uriGen": "semantic",
            "uriPrefix": NS2,
            "uriExt": "",
            "uriName": "not-available",
            "name": "na"
        });
        subject.base = {
            "guid": NA,
            "name": nt.NULL_NAME
        };
        this.nodeDict.set(NA, subject);

        this.pruningCondition = pruningCondition;

        this.writer = Writer(
            {
                format: "ttl",
                prefixes: {
                    foaf: "http://xmlns.com/foaf/0.1",
                    freebase: "http://rdf.freebase.com/ns/",
                    g: "http://base.google.com/ns/1.0",
                    fn: "http://www.w3.org/2005/xpath-functions/#",
                    owl: `${NS_owl}#`,
                    xsd: `${NS_xsd}#`,
                    rdfs: `${NS_rdfs}#`,
                    rdf: `${NS_rdf}#`,
                    IMMoRTALS: `${NS2}#`,
                    IMMoRTALS_gmei: `${NS2}/gmei#`,
                    IMMoRTALS_cp1: `${NS2}/cp#`,
                    IMMoRTALS_cp2: `${NS2}/cp2#`,
                    IMMoRTALS_cp_java: `${NS2}/cp/java#`,

                    IMMoRTALS_ordering: `${NS2}/ordering#`,
                    IMMoRTALS_bytecode: `${NS2}/bytecode#`,
                    IMMoRTALS_android: `${NS2}/android#`,
                    IMMoRTALS_core: `${NS2}/core#`,

                    IMMoRTALS_resources: `${NS2}/resources#`,
                    IMMoRTALS_resources_gps: `${NS2}/resources/gps#`,
                    IMMoRTALS_resources_gps_properties: `${NS2}/resources/gps/properties#`,
                    IMMoRTALS_resources_memory: `${NS2}/resources/memory#`,
                    IMMoRTALS_resources_network: `${NS2}/resources/network#`,

                    IMMoRTALS_functionality: `${NS2}/functionality#`,
                    IMMoRTALS_functionality_locationprovider: `${NS2}/functionality/locationprovider#`,
                    IMMoRTALS_functionality_imageprocessor: `${NS2}/functionality/imageprocessor#`,
                    IMMoRTALS_functionality_dataproperties: `${NS2}/functionality/dataproperties#`,

                    IMMoRTALS_property: `${NS2}/property#`,
                    IMMoRTALS_property_impact: `${NS2}/property/impact#`,

                    IMMoRTALS_com_securboration_immortals_example_instantiation: `${NS2}/com/securboration/immortals/example/instantiation#`,
                    IMMoRTALS_metrics: `${NS2}/metrics#`,
                    IMMoRTALS_connectivity: `${NS2}/connectivity#`,
                    IMMoRTALS_server: `${NS2}/server#`,
                    IMMoRTALS_image_fidelity: `${NS2}/image/fidelity#`,

                    IMMoRTALS_model: `${NS2}/model#`,
                    IMMoRTALS_ptr: `${NS2}/pointer#`,
                    IMMoRTALS_attr: `${NS2}/attribute#`,

                    IMMoRTALS_impl: `${NS2}/com/securboration/immortals/example/instantiation#`,
                    IMMoRTALS_spec: `${NS2}/spec#`,
                    IMMoRTALS_pattern_spec: `${NS2}/pattern/spec#`
                }
            });
    }

    randomString = (): string => {
        let text = "";
        let possible = "0123456789";
        for (let ix = 0; ix < 5; ix++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    /**
     * name,type,pointers,sets,base,attributes,children,guid
     * duck-typing:
     *   atom : contains nothing and has no pointers/sets/etc.
     *   model : contains things
     *   connection : has pointers/sets/etc.
     * Atoms are never subjects.
     *
     * If a subject is its own type then leave it out.
     */
    write = (subject: nt.Subject): void => {
        let generateRegExp = new RegExp("^<PATTERN>:(.+)");

        // this.context.logger.info(`write: ${subject.prune} ... ${(subject.prune & PruningFlag.Library)}`);
        /*
         Determine if the node should be written based
         on the pruning criteria.
         */
        if (subject.prune & this.pruningCondition.flag) {
            if (!this.pruningCondition.cond) { return; }
        } else {
            if (this.pruningCondition.cond) { return; }
        }
        let fnGuid = isClass(this.nodeDict, subject) ? noGuid : appendGuid;
        let subjectName: string = getRdfNameForNode(subject, fnGuid, acase.bactrian);
        let subjectType: string = objectifyType(subject.type, this.nodeDict);

        /**
         * This defines the bounds of the epoch.
         * Some objects are considered static for a particular epoch
         * and others are dynamic.
         * This attribute indicates that boundary.
         * Any object at this level or lower is considered to be an instance.
         * The default epoch boundary is the highest object for which
         * none of its decendants have meta-rules.
         * The higher static rules are presumed to have been specified elsewhere.
         */
        let attrs = subject.attributes;
        switch (subject.name.propagation) {
            case "preserve":
                this.context.logger.info(`not writing: ${subjectName}`);
                break;
            case "suppress":
                break;
            case null:
                if (subjectName === subjectType) {
                    this.context.logger.info(`not writing: ${subjectName}`);
                    return;
                }
                break;
            default:
                this.context.logger.info(`default writing: ${subjectName}`);
        }
        this.context.logger.debug(`subject: ${subjectName}`);

        this.writer.addTriple({
            subject: subjectName,
            predicate: `${NS2}#name`,
            object: Util.createLiteral(objectifyName(subject.name))
        });

        // this.context.logger.info(`write subject type: ${nt.TypeType.brief(subject.type)}`);
         this.writer.addTriple({
            subject: subjectName,
            predicate: `${NS_rdf}#type`,
            object: subjectType
        });

        // this.context.logger.info(`write external uuid: ${nt.})
        if (subject.name.extUuid && subject.name.extUuid.length > 0) {
            this.writer.addTriple({
                subject: subjectName,
                predicate: `${NS2}#hasExtGuid`,
                object: Util.createLiteral(`${subject.name.extUuid}`)
            });
        }

        // this.context.logger.info("write subject base");
        let base = subject.base;
        if (base !== null) {
            this.writer.addTriple({
                subject: subjectName,
                predicate: `${NS2}#base`,
                object: objectifyBase(subject.base, this.nodeDict)
            });
        }
        // this.context.logger.info("write subject attributes");
        for (let key in attrs) {
            let valueRaw = attrs[key];
            let valueLiteral: any;
            if (typeof valueRaw === "string") {

                if (generateRegExp.test(valueRaw)) {
                    let match = generateRegExp.exec(valueRaw);
                    if (match === null) {
                        valueLiteral = Util.createLiteral(`${this.randomString()}`);
                    } else {
                        valueLiteral = Util.createLiteral(`${match[1]}${this.randomString()}`);
                    }
                } else {
                    if (valueRaw.length < 1) {
                        continue;
                    }
                    valueLiteral = Util.createLiteral(`${valueRaw}`); // , "en");
                }
            } else if (typeof valueRaw === "boolean") {
                valueLiteral = Util.createLiteral(valueRaw);
            } else {
                valueLiteral = Util.createLiteral(valueRaw);
            }
            // let predicateName: string = `${NS2}attribute#${key}`;
            let predicateName = predicateContainsKey(key);
            switch (key) {
                case "comment":
                    predicateName = `${NS_rdfs}#comment`;
                    break;
                case "documentation":
                case "Documentation":
                    predicateName = `${NS2}#hasHumanReadableForm`;
                    break;
                default:
            }
            this.context.logger.debug(`attribute: ${key} => ${predicateName}`);

            this.writer.addTriple({
                subject: subjectName,
                predicate: predicateName,
                object: valueLiteral
            });
        }

        this.context.logger.info("write subject pointers");
        let ptrs = subject.pointers;
        for (let key in ptrs) {
            let valueNode = ptrs[key];
            this.writer.addTriple({
                subject: subjectName,
                predicate: predicateIndicatesKey(key),
                object: objectifyPointer(valueNode, this.nodeDict)
            });
        }

        this.context.logger.info("write subject sets");
        let sets: nt.Sets = subject.sets;
        for (let kind in sets) {
            let members = sets[kind];
            members.forEach((member) => {
                if (nt.isFaultType(member)) {
                    this.context.logger.info(`faulty member ${kind}`);
                } else if (nt.isNGuidType(member)) {
                    let memberGuid = member.guid;
                    // let memberName = member.name;
                    let objective = this.nodeDict.get(memberGuid);
                    if (typeof objective === "undefined") {
                        return;
                    }

                    let fnGuid = isClass(this.nodeDict, objective) ? noGuid : appendGuid;
                    let objectName = getRdfNameForNode(objective, fnGuid, acase.bactrian);
                    if (isAtom(objective)) {
                        this.context.logger.debug(`atom member> s:${subjectName} <atom> o:${objectName}`);
                    } else {
                        let predicateName = predicateContainsKey(kind);
                        this.context.logger.debug(`model member> s:${subjectName} p:{predicateName} o:${objectName}`);
                        this.writer.addTriple({
                            subject: subjectName,
                            predicate: predicateName,
                            object: objectName
                        });
                    }
                }
            });
        }

        this.context.logger.debug("write subject children");
        let children = subject.children;
        for (let key in children) {
            if (!children.hasOwnProperty(key)) { continue; }

            this.context.logger.debug(`child keys: ${key}`);
            let childIds = children[key];
            for (let guid in childIds) {
                if (!childIds.hasOwnProperty(guid)) { continue; }

                this.context.logger.debug(`guid: ${guid}`);
                let objective = this.nodeDict.get(guid);
                if (typeof objective === "undefined") {
                    return;
                }
                let fnGuid = isClass(this.nodeDict, objective) ? noGuid : appendGuid;
                let objectName = getRdfNameForNode(objective, fnGuid, acase.bactrian);

                let reason = childIds[guid];
                let parentReason = this.nodeDict.get(reason.parent);
                let childReason = this.nodeDict.get(reason.child);
                let predicateName = predicateByContainment(parentReason, childReason);
                this.context.logger.debug(`model child: s:${subjectName} p:${predicateName} o:${objectName}`);

                this.writer.addTriple({
                    subject: subjectName,
                    predicate: predicateName,
                    object: objectName
                });
            }
        }
    }

    complete = (): void => {
        this.writer.end((error: Error, result: any) => {
            error;
            this.ttlStr = result;
        });
    }

    visitNode = (node: nlv.ListNode): void => {
        let subject = nt.Subject.makeByHash(node);
        this.context.logger.info(`visiting a node: ${nt.Subject.brief(subject)}`);
        this.write(subject);
    }
}

/**
 * References:
 https://github.com/antoniogarrote/rdfstore-js
 https://github.com/RubenVerborgh/N3.js/
 https://www.w3.org/community/rdfjs/wiki/Comparison_of_RDFJS_libraries
 https://github.com/txwkx/RDFJS4U
 */
