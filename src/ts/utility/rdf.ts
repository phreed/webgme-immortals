
import _ = require('underscore');
import { Writer, Util } from 'n3';
import * as nlv from 'utility/NodeListVisitor';
import * as acase from 'utility/altCase';


const NS = 'http://darpa.mil/immortals/ontology/r1.0.0/';
const NS_owl = 'http://www.w3.org/2002/07/owl';
const NS_xsd = 'http://www.w3.org/2001/XMLSchema';
const NS_rdfs = 'http://www.w3.org/2000/01/rdf-schema';
const NS_rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns';

const NS2 = 'http://darpa.mil/immortals/ontology/r2.0.0/';

/**
 * [writeRdfTtlString description]
 * @param  {PluginJS.Dictionary | void}        attr [description]
 * @return {string}                   [description]
 */

function extractValue(map: any, key: string, fault: string): string {
    if (map === null) return fault;
    switch (typeof map) {
        case 'object':
            return ((key in map) ? map[key] : fault);
        case 'string':
            return map;
        default:
            console.log("what is that: " + typeof map);
            return fault;
    }
}

function objectifyName(nodeName: any): string {
    // console.log("objectify name: ");
    return extractValue(nodeName, 'name', 'NA');
}

function objectifyType(nodeType: any): string {
    // console.log("objectify type: ");
    let domain = extractValue(nodeType, 'domain', 'NA');
    let parent = extractValue(nodeType, 'parent', 'NA');
    return parent + '::' + domain;
}

function objectifyBase(nodeBase: any, dict: any): string {
    let guid = nodeBase['guid'];
    // console.log("objectify base: " + guid);
    return objectifyByGuid(guid, dict);
}

function objectifyChild(nodeGuid: string, dict: any): string {
    // console.log("objectify child: " + nodeGuid);
    return objectifyByGuid(nodeGuid, dict);
}

function objectifyPointer(nodePointer: any, dict: any): string {
    let guid = nodePointer['guid'];
    // console.log("objectify pointer: " + guid);
    return objectifyByGuid(guid, dict);
}

function objectifyByGuid(nodeGuid: string, dict: any): string {
    // console.log("object by guid: " + nodeGuid);
    let node = dict[nodeGuid];
    return getRdfNameForNode(node, true, acase.bactrian);
}

function isFilled(name: string | null | undefined) {
    if (name === null) return false;
    if (name === undefined) return false;
    if (name.length < 1) return false;
    return true;
}

function cookName(rawName: string): string {
    return rawName.trim().replace(/ +/g, '_').replace(/:/g, '-').replace(/\//g, '_');
}

function buildSemanticUriForNode(name: any, conditioner: (raw: string)=>string): string {
    let uriPrefix: string = extractValue(name, 'uriPrefix', '');
    let uriExt: string = extractValue(name, 'uriExt', '');
    let uriName: string = extractValue(name, 'uriName', '');
    let nickName: string = conditioner(extractValue(name, 'name', ''));

    if (uriExt.slice(-1) === '/') {
        // console.log("your uriExt has a trailing slash (/) you should remove it");
        uriExt = uriExt.slice(0, -1);
    }
    if (uriExt.slice(-1) === '#') {
        // console.log("your uriExt has a trailing octathorp (#) you should remove it");
        uriExt = uriExt.slice(0, -1);
    }

    if (isFilled(uriName)) {
        return uriPrefix + uriExt + '#' + uriName;
    } else if (isFilled(nickName)) {
        return uriPrefix + uriExt + '#' + cookName(nickName);
    } else {
        return uriPrefix + uriExt + '#' + 'missing';
    }
}

function buildUriForNode(name: any, conditioner: (raw: string)=>string): string {
    let nickName: string = conditioner(extractValue(name, 'name', 'no-name'));

    return NS + 'model#' + cookName(nickName);
}

function getRdfNameForNode(node: any, includeGuid: boolean, conditioner: (raw: string)=>string): string {
    let guid = extractValue(node, 'guid', '00000');
    // console.log('write node having gid: ' + guid);
    let nameDict = node['name'];
    let uriGen = extractValue(nameDict, 'uriGen', 'none');
    // console.log('uri generator: ' + uriGen);
    switch (uriGen) {
        case "semantic":
            if (includeGuid) {
                return buildSemanticUriForNode(nameDict, conditioner) + '--' + guid;
            } else {
                return buildSemanticUriForNode(nameDict, conditioner);
            }
        case undefined:
        case null:
        case "none":
        if (includeGuid) {
                return buildUriForNode(nameDict, conditioner) + '--' + guid;
            } else {
                return buildUriForNode(nameDict, conditioner);
            }
        default:
            return NS + '#unknown';
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
    if (!_.isEmpty(node['children'])) return false;
    if (!_.isEmpty(node['pointers'])) return false;
    return true;
}


    /** 
 * model => a node with children
 * If a child is an 'atom' then its attributes are rendered
 * as triples where the model is the subject.
 * Children that are not atoms are treated as objects.
 */
function isModel(node: any): boolean {
    if (_.isEmpty(node['children'])) return false;
    return true;
}

/**
 * connection => a node with pointers
 * 
 */ 
    function isConnection(node: any): boolean {
    if (_.isEmpty(node['pointers'])) return false;
    return true;
}

/**
 * If the base of the node is the FCO then the
 * node describes the class.
 */
function isClass(node: any): boolean {
    if (node['base']['base'] === null) return true;
    return false;
}


/**
 * A class for functors which serialize a node.
 */
export class RdfNodeSerializer {

    private writer: N3.Output;
    public ttlStr: string = 'none produced';
    private nodeDict: PluginJS.Dictionary;

    constructor(dict: PluginJS.Dictionary) {
        this.nodeDict = dict;
        dict['NA'] = {
            'name': {
                'uriGen': 'semantic',
                'uriPrefix': NS,
                'uriName': 'not-available',
                'name': 'na'
            },
            'guid': 'NA',
            'base': {
                'guid': 'NA'
            }
        };

        this.writer = Writer(
            {
                format: 'ttl',
                prefixes: {
                    foaf: 'http://xmlns.com/foaf/0.1',
                    freebase: 'http://rdf.freebase.com/ns/',
                    g: 'http://base.google.com/ns/1.0',
                    fn: 'http://www.w3.org/2005/xpath-functions/#',
                    owl: NS_owl + '#',
                    xsd: NS_xsd + '#',
                    rdfs: NS_rdfs + '#',
                    rdf: NS_rdf + '#',
                    IMMoRTALS: NS + '#',
                    IMMoRTALS_cp: NS + 'cp#',
                    IMMoRTALS_cp_java: NS + 'cp/java#',

                    IMMoRTALS_ordering: NS + 'ordering#',
                    IMMoRTALS_bytecode: NS + 'bytecode#',
                    IMMoRTALS_android: NS + 'android#',
                    IMMoRTALS_core: NS + 'core#',

                    IMMoRTALS_resources: NS + 'resources#',
                    IMMoRTALS_resources_gps: NS + 'resources/gps#',
                    IMMoRTALS_resources_gps_properties: NS + 'resources/gps/properties#',
                    IMMoRTALS_resources_memory: NS + 'resources/memory#',

                    IMMoRTALS_functionality: NS + 'functionality#',
                    IMMoRTALS_functionality_locationprovider: NS + 'functionality/locationprovider#',
                    IMMoRTALS_functionality_imageprocessor: NS + 'functionality/imageprocessor#',
                    IMMoRTALS_functionality_dataproperties: NS + 'functionality/dataproperties#',

                    IMMoRTALS_property: NS + 'property#',
                    IMMoRTALS_property_impact: NS + 'property/impact#',

                    IMMoRTALS_com_securboration_immortals_example_instantiation: NS + 'com/securboration/immortals/example/instantiation#',
                    IMMoRTALS_metrics: NS + 'metrics#',
                    IMMoRTALS_connectivity: NS + 'connectivity#',
                    IMMoRTALS_server: NS + 'server#',
                    IMMoRTALS_image_fidelity: NS + 'image/fidelity#',

                    IMMoRTALS_model: NS + 'model#',
                    IMMoRTALS_ptr: NS + 'pointer#',
                    IMMoRTALS_attr: NS + 'attribute#',

                    IMMoRTALS_impl: NS2 + 'com/securboration/immortals/example/instantiation#'
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
        let subjectName: string = getRdfNameForNode(subject, true, acase.bactrian);
        if (isAtom(subject)) {
            // console.log('an atom ' + subjectName);
            return;
        }    

        // console.log('write subject name');
        this.writer.addTriple({
            subject: subjectName,
            predicate: NS + '#name',
            object: Util.createLiteral(objectifyName(subject['name']))
        });

        // console.log('write subject type');
        this.writer.addTriple({
            subject: subjectName,
            predicate: NS_rdf + '#type',
            object: Util.createLiteral(objectifyType(subject['type']))
        });
        // console.log('write subject base');
        let base = subject['base'];
        if (base !== null) {
            this.writer.addTriple({
                subject: subjectName,
                predicate: NS + '#base',
                object: objectifyBase(subject['base'], this.nodeDict)
            });
        }
        // console.log('write subject attributes');
        let attrs = subject['attributes'];
        for (let key in attrs) {
            let predicateName: string = NS + 'attribute#' + key;
            switch (key) {
                case 'comment':
                case 'documentation':
                    predicateName = NS_rdfs + '#comment';
                    break;
                default:
                    // console.log('attribute: ' + key);
            }
            let valueRaw = attrs[key];
            let valueLiteral: any;
            switch (typeof valueRaw) {
                case 'string':
                    valueLiteral = Util.createLiteral(valueRaw, 'en-gb');
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
        // console.log('write subject pointers');
        let ptrs = subject['pointers'];
        for (let key in ptrs) {
            let valueNode = ptrs[key];

            this.writer.addTriple({
                subject: subjectName,
                predicate: NS + 'pointer#' + key,
                object: objectifyPointer(valueNode, this.nodeDict)
            });
        }
        // console.log('write subject sets');
        // console.log('write subject children');
        let children = subject['children'];
        for (let key in children) {
            // console.log('child keys: ' + key);
            let child = children[key];
            // console.log('guids: ' + child.length);
            for (let guid of child) {
                // console.log('guid: ' + guid);
                let objective = this.nodeDict[guid];
                let objectName = getRdfNameForNode(objective, false, acase.dromedary);
                if (isAtom(objective)) {
                    // console.log('atom attr: ' + objectName)
                    let attrs = objective['attributes'];
                    for (let key in attrs) {
                        let predicateName: string = objectName + acase.bactrian(key);
                       
                        let valueRaw = attrs[key];
                        let valueLiteral: any;
                        switch (typeof valueRaw) {
                            case 'string':
                                valueLiteral = Util.createLiteral(valueRaw, 'en-gb');
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
                    this.writer.addTriple({
                        subject: subjectName,
                        predicate: NS + '#child',
                        object: objectifyChild(guid, this.nodeDict)
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
