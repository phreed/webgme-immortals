

import { Writer, Util } from 'n3';
import * as nlv from 'utility/NodeListVisitor';

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
    console.log("objectify name: ");
    return extractValue(nodeName, 'name', 'NA');
}

function objectifyType(nodeType: any): string {
    console.log("objectify type: ");
    let domain = extractValue(nodeType, 'domain', 'NA');
    let parent = extractValue(nodeType, 'parent', 'NA');
    return parent + '::' + domain;
}

function objectifyBase(nodeBase: any, dict: any): string {
    let guid = nodeBase['guid'];
    console.log("objectify base: " + guid);
    return objectifyByGuid(guid, dict);
}

function objectifyChild(nodeGuid: string, dict: any): string {
    console.log("objectify child: " + nodeGuid);
    return objectifyByGuid(nodeGuid, dict);
}

function objectifyPointer(nodePointer: any, dict: any): string {
    let guid = nodePointer['guid'];
    console.log("objectify pointer: " + guid);
    return objectifyByGuid(guid, dict);
}

function objectifyByGuid(nodeGuid: string, dict: any): string {
    console.log("object by guid: " + nodeGuid);
    let node = dict[nodeGuid];
    return getRdfNameForNode(node);
}

function isFilled(name: string | null | undefined) {
    if (name === null) return false;
    if (name === undefined) return false;
    if (name.length < 1) return false;
    return true;
}

function buildSemanticUriForNode(name: any): string {
    let uriPrefix: string = extractValue(name, 'uriPrefix', '');
    let uriExt: string = extractValue(name, 'uriExt', '');
    let uriName: string = extractValue(name, 'uriName', '');
    let nickName: string = extractValue(name, 'name', '');

    if (uriExt.slice(-1) !== '#') uriExt += '#';

    if (isFilled(uriName)) {
        return uriPrefix + uriExt + uriName;
    } else if (isFilled(nickName)) {
        return uriPrefix + uriExt + nickName;
    } else {
        return uriPrefix + uriExt + 'missing';
    }
}

function buildUriForNode(name: any): string {
    let nickName: string = extractValue(name, 'name', 'no-name');
    return "http://darpa.mil/immortals/ontology/r1.0.0/model#" + nickName;
}

function getRdfNameForNode(node: any): string {
    let guid = extractValue(node, 'guid', '00000');
    console.log('write node having gid: ' + guid);
    let nameDict = node['name'];
    let uriGen = extractValue(nameDict, 'uriGen', 'none');
    console.log('uri generator: ' + uriGen);
    switch (uriGen) {
        case "semantic":
            return buildSemanticUriForNode(nameDict) + '--' + guid;
        case undefined:
        case null:
        case "none":
            return buildUriForNode(nameDict) + '--' + guid;
        default:
            return "http://darpa.mil/immortals/ontology/r1.0.0/unknown";
    }
}

/**
 * A class for functors which serialize a node.
 */
export class RdfNodeSerializer {
    private ns = 'http://darpa.mil/immortals/ontology/r1.0.0/';

    private writer: N3.Output;
    public ttlStr: string = 'none produced';
    private nodeDict: PluginJS.Dictionary;

    constructor(dict: PluginJS.Dictionary) {
        this.nodeDict = dict;
        dict['NA'] = {
            'name': {
                'uriGen': 'semantic',
                'uriPrefix': this.ns,
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
                    foaf:  'http://xmlns.com/foaf/0.1',
                    freebase: 'http://rdf.freebase.com/ns/',
                    g:     'http://base.google.com/ns/1.0',
                    fn:    'http://www.w3.org/2005/xpath-functions/#',
                    owl:   'http://www.w3.org/2002/07/owl#',
                    xsd:   'http://www.w3.org/2001/XMLSchema#',
                    rdfs:  'http://www.w3.org/2000/01/rdf-schema#',
                    rdf:   'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
                    b: this.ns + '#',
                    IMMoRTALS_cp: this.ns + 'cp#',
                    IMMoRTALS_ordering: this.ns + 'ordering#',
                    IMMoRTALS_bytecode: this.ns + 'bytecode#',
                    IMMoRTALS_android: this.ns + 'android#',
                    IMMoRTALS_core: this.ns + 'core#',
                    IMMoRTALS_resources: this.ns + 'resources#',
                    IMMoRTALS_resources_gps_properties: this.ns + 'resources/gps/properties#',
                    IMMoRTALS_functionality_locationprovider: this.ns + 'functionality/locationprovider#',
                    IMMoRTALS_resources_memory: this.ns + 'resources/memory#',
                    IMMoRTALS_functionality_imageprocessor: this.ns + 'functionality/imageprocessor#',
                    IMMoRTALS_resources_gps: this.ns + 'resources/gps#',
                    IMMoRTALS_property: this.ns + 'property#',
                    IMMoRTALS_property_impact: this.ns + 'property/impact#',
                    IMMoRTALS_functionality_dataproperties: this.ns + 'functionality/dataproperties#',
                    IMMoRTALS_functionality: this.ns + 'functionality#',
                    IMMoRTALS: 'http://darpa.mil/immortals/ontology/r2.0.0#',
                    IMMoRTALS_com_securboration_immortals_example_instantiation: this.ns + 'com/securboration/immortals/example/instantiation#',
                    IMMoRTALS_metrics: this.ns + 'metrics#',
                    IMMoRTALS_connectivity: this.ns + 'connectivity#',
                    IMMoRTALS_server: this.ns + 'server#',
                    IMMoRTALS_cp_java: this.ns + 'cp/java#',
                    IMMoRTALS_image_fidelity: this.ns + 'image/fidelity#'
             }
            });
    }

    /**
     * name,type,pointers,sets,base,attributes,children,guid
     */
    write = (node: any): void => {
        
        let subjectName: string = getRdfNameForNode(node);

        console.log('write subject name');
        this.writer.addTriple({
            subject: subjectName,
            predicate: this.ns + '#name',
            object: Util.createLiteral(objectifyName(node['name']))
        });

        console.log('write subject type');
        this.writer.addTriple({
            subject: subjectName,
            predicate: this.ns + '#type',
            object: Util.createLiteral(objectifyType(node['type']))

        });
        console.log('write subject base');
        let base = node['base'];
        if (base !== null) {
            this.writer.addTriple({
                subject: subjectName,
                predicate: this.ns + '#base',
                object: objectifyBase(node['base'], this.nodeDict)
            });
        }
        console.log('write subject attributes');
        let attrs = node['attributes'];
        for (let key in attrs) {
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
                predicate: this.ns + '#attr=' + key,
                object: valueLiteral
            });
        }
        console.log('write subject pointers');
        let ptrs = node['pointers'];
        for (let key in ptrs) {
            let valueNode = ptrs[key];

            this.writer.addTriple({
                subject: subjectName,
                predicate: this.ns + '#pointer=' + key,
                object: objectifyPointer(valueNode, this.nodeDict)
            });
        }
        console.log('write subject sets');
        console.log('write subject children');
        let children = node['children'];
        for (let key in children) {
            console.log('child keys: ' + key);
            let child = children[key];
            console.log('guids: ' + child.length);
            for (let guid of child) {
                console.log('guid: ' + guid);
                this.writer.addTriple({
                    subject: subjectName,
                    predicate: this.ns + '#child',
                    object: objectifyChild(guid, this.nodeDict)
                });
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
