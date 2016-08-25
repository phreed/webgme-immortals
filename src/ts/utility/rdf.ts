

import { Writer } from 'n3';

/**
 * [writeRdfTtlString description]
 * @param  {PluginJS.Dictionary | void}        attr [description]
 * @return {string}                   [description]
 */
export function writeRdfTtlString(attr: PluginJS.Dictionary | void): string {
    let writer: Writer = new Writer(
        {
            format: 'N-Triples',
            prefixes: { c: 'http://example.org/cartoons#' }
        });
    writer.addTriple('http://example.org/cartoons#Tom',
        'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
        'http://example.org/cartoons#Cat');
    writer.addTriple({
        subject: 'http://example.org/cartoons#Tom',
        predicate: 'http://example.org/cartoons#name',
        object: '"Tom"'
    });
    writer.end((error, result) => { console.log(result); });

    return "result";
}

/**
 * References:
 https://github.com/antoniogarrote/rdfstore-js
 https://github.com/RubenVerborgh/N3.js/
 https://www.w3.org/community/rdfjs/wiki/Comparison_of_RDFJS_libraries
 https://github.com/txwkx/RDFJS4U
 */
