
import _ = require("underscore");
import { Writer, Util } from "n3";
import * as nlv from "serializer/NodeListVisitor";
import * as acase from "utility/altCase";
import { PruningFlag, PruningCondition } from "serializer/filters";


const NS1 = "http://darpa.mil/immortals/ontology/r1.0.0/";
const NS_owl = "http://www.w3.org/2002/07/owl";
const NS_xsd = "http://www.w3.org/2001/XMLSchema";
const NS_rdfs = "http://www.w3.org/2000/01/rdf-schema";
const NS_rdf = "http://www.w3.org/1999/02/22-rdf-syntax-ns";

const NS2 = "http://darpa.mil/immortals/ontology/r2.0.0/";
const NS2_ex = NS2 + "com/securboration/immortals/example";

/**
 * [writeRdfTtlString description]
 * @param  {PluginJS.Dictionary | void}        attr [description]
 * @return {string}                   [description]
 */

function appendGuid(raw: string, guid: string): string {
    return raw + "--" + guid;
}
function noGuid(raw: string, guid: string): string {
    return raw;
}

function extractValue(map: any, key: string, fault: string): string {
    if (map === null) { return fault; }
    switch (typeof map) {
        case "object":
            return ((key in map) ? map[key] : fault);
        case "string":
            return map;
        default:
            console.log("what is that: " + typeof map);
            return fault;
    }
}

function objectifyName(nodeName: any): string {
    // console.log("objectify name: ");
    return extractValue(nodeName, "name", "NA");
}

function objectifyType(nodeType: any, dict: any): string {
    // console.log("objectify type: ");
    if ("name" in nodeType) {
        return NS1 + "cp#" + nodeType["name"];
    }
    let domain = extractValue(nodeType, "domain", "NA");
    let metaNode = extractValue(nodeType, "meta", "NA");
    let rootNode = extractValue(nodeType, "root", "NA");
    let baseNode = extractValue(nodeType, "base", "NA");

    return objectifyByGuid(metaNode, dict);
}

function objectifyBase(nodeBase: any, dict: any): string {
    let guid = nodeBase["guid"];
    // console.log("objectify base: " + guid);
    return objectifyByGuid(guid, dict);
}

function objectifyPointer(nodePointer: any, dict: any): string {
    let guid = nodePointer["guid"];
    // console.log("objectify pointer: " + guid);
    return objectifyByGuid(guid, dict);
}

function objectifyByGuid(nodeGuid: string, dict: any): string {
    // console.log("object by guid: " + nodeGuid);
    let node = dict[nodeGuid];
    return getRdfNameForNode(node, appendGuid, acase.bactrian);
}

function predicateByNode(key: string, node: any): string {
    // console.log("predicate by node: " + node);
    return NS1 + "#has" + acase.bactrian(acase.cookName(key));
}

function isFilled(name: string | null | undefined) {
    if (name === null) { return false; }
    if (name === undefined) { return false; }
    if (name.length < 1) { return false; }
    return true;
}

function buildSemanticUriForNode(name: any, conditioner: (raw: string) => string): string {
    let uriPrefix: string = extractValue(name, "uriPrefix", "");
    let uriExt: string = extractValue(name, "uriExt", "");
    let uriName: string = extractValue(name, "uriName", "");
    let nickName: string = conditioner(extractValue(name, "name", ""));

    if (uriExt.slice(-1) === "/") {
        // console.log("your uriExt has a trailing slash (/) you should remove it");
        uriExt = uriExt.slice(0, -1);
    }
    if (uriExt.slice(-1) === "#") {
        // console.log("your uriExt has a trailing octathorp (#) you should remove it");
        uriExt = uriExt.slice(0, -1);
    }

    if (isFilled(uriName)) {
        return uriPrefix + uriExt + "#" + uriName;
    } else if (isFilled(nickName)) {
        return uriPrefix + uriExt + "#" + acase.cookName(nickName);
    } else {
        return uriPrefix + uriExt + "#" + "missing";
    }
}

function buildUriForNode(name: any, conditioner: (raw: string) => string): string {
    let nickName: string = conditioner(extractValue(name, "name", "no-name"));

    return NS1 + "model#" + acase.cookName(nickName);
}

function getRdfNameForNode(node: any,
    guidFn: (raw: string, guid: string) => string,
    conditioner: (raw: string) => string): string {
    let guid = extractValue(node, "guid", "00000");
    // console.log("write node having gid: " + guid);
    let nameDict = node["name"];
    let uriGen = extractValue(nameDict, "uriGen", "none");
    // console.log("uri generator: " + uriGen);
    switch (uriGen) {
        case "semantic":
            return guidFn(buildSemanticUriForNode(nameDict, conditioner), guid);
        case undefined:
        case null:
        case "none":
            return guidFn(buildUriForNode(nameDict, conditioner), guid);
        default:
            return NS1 + "#unknown";
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
function isAtom(node: any): boolean {
    if (!_.isEmpty(node["children"])) { return false; }
    if (!_.isEmpty(node["pointers"])) { return false; }
    return true;
}


/** 
* model => a node with children
* If a child is an "atom" then its attributes are rendered
* as triples where the model is the subject.
* Children that are not atoms are treated as objects.
*/
function isModel(node: any): boolean {
    if (_.isEmpty(node["children"])) { return false; }
    return true;
}

/**
 * connection => a node with pointers
 * 
 */
function isConnection(node: any): boolean {
    if (_.isEmpty(node["pointers"])) { return false; }
    return true;
}

/**
 * If the base of the node is the FCO then the
 * node describes the class.
 */
function isClass(node: any): boolean {
    if (node["base"]["base"] === null) { return true; }
    return false;
}


/**
 * A class for functors which serialize a node.
 */
export class RdfNodeSerializer {

    private pruningCondition: PruningCondition;
    private writer: N3.Output;
    public ttlStr: string = "none produced";
    private nodeDict: PluginJS.Dictionary;

    constructor(dict: PluginJS.Dictionary, pruningCondition: PruningCondition) {
        this.nodeDict = dict;
        dict["NA"] = {
            "name": {
                "uriGen": "semantic",
                "uriPrefix": NS1,
                "uriName": "not-available",
                "name": "na"
            },
            "guid": "NA",
            "base": {
                "guid": "NA"
            }
        };

        this.pruningCondition = pruningCondition;

        this.writer = Writer(
            {
                format: "ttl",
                prefixes: {
                    foaf: "http://xmlns.com/foaf/0.1",
                    freebase: "http://rdf.freebase.com/ns/",
                    g: "http://base.google.com/ns/1.0",
                    fn: "http://www.w3.org/2005/xpath-functions/#",
                    owl: NS_owl + "#",
                    xsd: NS_xsd + "#",
                    rdfs: NS_rdfs + "#",
                    rdf: NS_rdf + "#",
                    IMMoRTALS: NS1 + "#",
                    IMMoRTALS_cp: NS1 + "cp#",
                    IMMoRTALS_cp_java: NS1 + "cp/java#",

                    IMMoRTALS_ordering: NS1 + "ordering#",
                    IMMoRTALS_bytecode: NS1 + "bytecode#",
                    IMMoRTALS_android: NS1 + "android#",
                    IMMoRTALS_core: NS1 + "core#",

                    IMMoRTALS_resources: NS1 + "resources#",
                    IMMoRTALS_resources_gps: NS1 + "resources/gps#",
                    IMMoRTALS_resources_gps_properties: NS1 + "resources/gps/properties#",
                    IMMoRTALS_resources_memory: NS1 + "resources/memory#",

                    IMMoRTALS_functionality: NS1 + "functionality#",
                    IMMoRTALS_functionality_locationprovider: NS1 + "functionality/locationprovider#",
                    IMMoRTALS_functionality_imageprocessor: NS1 + "functionality/imageprocessor#",
                    IMMoRTALS_functionality_dataproperties: NS1 + "functionality/dataproperties#",

                    IMMoRTALS_property: NS1 + "property#",
                    IMMoRTALS_property_impact: NS1 + "property/impact#",

                    IMMoRTALS_com_securboration_immortals_example_instantiation: NS1 + "com/securboration/immortals/example/instantiation#",
                    IMMoRTALS_metrics: NS1 + "metrics#",
                    IMMoRTALS_connectivity: NS1 + "connectivity#",
                    IMMoRTALS_server: NS1 + "server#",
                    IMMoRTALS_image_fidelity: NS1 + "image/fidelity#",

                    IMMoRTALS_model: NS1 + "model#",
                    IMMoRTALS_ptr: NS1 + "pointer#",
                    IMMoRTALS_attr: NS1 + "attribute#",

                    IMMoRTALS_impl: NS2 + "com/securboration/immortals/example/instantiation#"
                }
            });
    }


    /**
     * name,type,pointers,sets,base,attributes,children,guid
     * 
     * duck-typing: {atom model connection}
     * 
     */
    write = (subject: any): void => {
        // console.log("write: " + subject["prune"] + " ... " + (subject["prune"] & PruningFlag.Library))
        if (subject["prune"] & this.pruningCondition.flag) {
            if (!this.pruningCondition.cond) { return; }
        } else {
            if (this.pruningCondition.cond) { return; }
        }

        let subjectName: string = getRdfNameForNode(subject, appendGuid, acase.bactrian);
        if (isAtom(subject)) {
            // console.log("an atom " + subjectName);
            return;
        }

        // console.log("write subject name");
        this.writer.addTriple({
            subject: subjectName,
            predicate: NS1 + "#name",
            object: Util.createLiteral(objectifyName(subject["name"]))
        });

        // console.log("write subject type");
        this.writer.addTriple({
            subject: subjectName,
            predicate: NS_rdf + "#type",
            object: objectifyType(subject["type"], this.nodeDict)
        });
        // console.log("write subject base");
        let base = subject["base"];
        if (base !== null) {
            this.writer.addTriple({
                subject: subjectName,
                predicate: NS1 + "#base",
                object: objectifyBase(subject["base"], this.nodeDict)
            });
        }
        // console.log("write subject attributes");
        let attrs = subject["attributes"];
        for (let key in attrs) {
            let predicateName: string = NS1 + "attribute#" + key;
            switch (key) {
                case "comment":
                case "documentation":
                    predicateName = NS_rdfs + "#comment";
                    break;
                default:
                // console.log("attribute: " + key);
            }
            let valueRaw = attrs[key];
            let valueLiteral: any;
            switch (typeof valueRaw) {
                case "string":
                    valueLiteral = Util.createLiteral(valueRaw, "en-gb");
                    break;
                default:
                    valueLiteral = Util.createLiteral(valueRaw);
            }
            this.writer.addTriple({
                subject: subjectName,
                predicate: predicateName,
                object: valueLiteral
            });
        }
        // console.log("write subject pointers");
        let ptrs = subject["pointers"];
        for (let key in ptrs) {
            let valueNode = ptrs[key];

            this.writer.addTriple({
                subject: subjectName,
                predicate: NS1 + "pointer#" + key,
                object: objectifyPointer(valueNode, this.nodeDict)
            });
        }
        // console.log("write subject sets");
        // console.log("write subject children");
        let children = subject["children"];
        for (let key in children) {
            // console.log("child keys: " + key);
            let child = children[key];
            // console.log("guids: " + child.length);
            for (let guid of child) {
                // console.log("guid: " + guid);
                let objective = this.nodeDict[guid];
                let objectName = getRdfNameForNode(objective, noGuid, acase.dromedary);
                if (isAtom(objective)) {
                    // console.log("atom attr: " + objectName)
                    let attrs = objective["attributes"];
                    for (let key in attrs) {
                        let predicateName: string = objectName + acase.bactrian(key);

                        let valueRaw = attrs[key];
                        let valueLiteral: any;
                        switch (typeof valueRaw) {
                            case "string":
                                valueLiteral = Util.createLiteral(valueRaw, "en-gb");
                                break;
                            default:
                                valueLiteral = Util.createLiteral(valueRaw);
                        }
                        this.writer.addTriple({
                            subject: subjectName,
                            predicate: predicateName,
                            object: valueLiteral
                        });
                    }
                } else {
                    let objective = this.nodeDict[guid];
                    let predicateName = predicateByNode(key, objective);

                    let ojectName = objectifyByGuid(guid, this.nodeDict);

                    this.writer.addTriple({
                        subject: subjectName,
                        predicate: predicateName,
                        object: objectName
                    });
                }
            }
        }
    }

    complete = (): void => {
        this.writer.end((error, result) => {
            this.ttlStr = result;
        });
    }

    visitNode = (node: nlv.ListNode): void => {
        // console.log("visiting a node: " + Object.keys(node));
        this.write(node);
    }
}

/**
 * References:
 https://github.com/antoniogarrote/rdfstore-js
 https://github.com/RubenVerborgh/N3.js/
 https://www.w3.org/community/rdfjs/wiki/Comparison_of_RDFJS_libraries
 https://github.com/txwkx/RDFJS4U
 */
