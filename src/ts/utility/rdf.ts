

import { Writer, Util } from 'n3';
import * as nlv from 'utility/NodeListVisitor';

/**
 * [writeRdfTtlString description]
 * @param  {PluginJS.Dictionary | void}        attr [description]
 * @return {string}                   [description]
 */

function extractValue(node: any, key: string, fault: string): string {
    if (node === null) return fault;
    return ((key in node) ? node[key] : fault);
}

function buildSemanticUriForNode(node: any): string {
    let uriPrefix: string = extractValue(node, 'uriPrefix', '');
    let uriExt: string = extractValue(node, 'uriExt', '');
    let uriName: string = extractValue(node, 'uriName', '');
    let name: string = extractValue(node, 'name', '');

    if (uriExt.slice(-1) !== '#') uriExt += '#';

    if (uriName == null || uriName.length == 0) {
        return uriPrefix + uriExt + name;
    } else {
        return uriPrefix + uriExt + uriName;
    }
}

function getRdfNameForNode(node: any): string {
    switch (extractValue(node, 'uriGen', 'none')) {
        case "none":
        case "semantic":
            return buildSemanticUriForNode(node);
        case undefined:
        case null:
        case "none":
        default:
            return "none";
    }
}

export class RdfNodeSerializer {
    private writer: N3.Output;
    public ttlStr: string = 'none produced';

    constructor() {
        this.writer = Writer(
            {
                format: 'N-Triples',
                prefixes: { b: 'http://darpa.mil/immortals/ontology/r1.0.0/#' }
            });
    }

    /**
     * name,type,pointers,sets,base,attributes,children,guid
     */
    write = (node: any): void => {
        let subjectName: string = getRdfNameForNode(node);
        let ns = 'http://darpa.mil/immortals/ontology/r1.0.0/#';

        // name
        this.writer.addTriple({
            subject: subjectName,
            predicate: ns + 'name',
            object: extractValue(node['name'], 'name', 'NA')
        });

        // type
        this.writer.addTriple({
            subject: subjectName,
            predicate: ns + 'type',
            object: extractValue(node['type'], 'domain', 'NA')
        });
        // base
        this.writer.addTriple({
            subject: subjectName,
            predicate: ns + 'base',
            object: extractValue(node['base'], 'name', 'NA')
            + '--' + extractValue(node['base'], 'guid', 'NA')
        });
        // attributes
        let attrs = node['attributes'];
        for (let key in attrs) {
            let value = attrs[key];
            this.writer.addTriple({
                subject: subjectName,
                predicate: ns + 'attr=' + key,
                object: Util.createLiteral(value)
            });
        }
        // pointers
        let ptrs = node['pointers'];
        for (let key in ptrs) {
            let value = ptrs[key];
            let object = extractValue(value, 'name', 'NA')
                + '--' + extractValue(value, 'guid', 'NA')

            this.writer.addTriple({
                subject: subjectName,
                predicate: ns + 'pointer=' + key,
                object: ns + object
            });
        }
        // sets
        // children
        let children = node['children'];
        for (let key in children) {
            let value = children[key];
            let targetName = extractValue(value, 'name', 'NA')
                + '--' + extractValue(value, 'guid', 'NA')

            this.writer.addTriple({
                subject: subjectName,
                predicate: ns + 'child',
                object: ns + targetName
            });
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
