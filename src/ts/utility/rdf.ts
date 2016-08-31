

import {Writer} from 'n3';

/**
 * [writeRdfTtlString description]
 * @param  {PluginJS.Dictionary | void}        attr [description]
 * @return {string}                   [description]
 */
export class RdfSerializer {
    writer: N3.Output;

    constructor(fd: any) {
       
        this.writer = Writer(fd,
            {
                format: 'N-Triples',
                prefixes: { b: 'http://darpa.mil/immortals/ontology/r1.0.0/#' }
            });
    }

    write(attr: PluginJS.Dictionary | void): void {
        this.writer.addTriple({
            subject: 'http://example.org/cartoons#Tom',
            predicate: 'http://example.org/cartoons#name',
            object: '"Tom"'
        });
    }

    close() {
        this.writer.end((error, result) => { 
            console.log(result); 
        });
    }
}

/**
 * References:
 https://github.com/antoniogarrote/rdfstore-js
 https://github.com/RubenVerborgh/N3.js/
 https://www.w3.org/community/rdfjs/wiki/Comparison_of_RDFJS_libraries
 https://github.com/txwkx/RDFJS4U
 */
