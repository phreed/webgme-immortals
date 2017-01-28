
// import { NodeStringDecoder } from 'string_decoder';

export type ListNode = {};

export interface Action {
    (node: ListNode): void;
}

export function visitList(nodes: { [guid: string]: ListNode }, action: Action): void {
    for (let nodeKey in nodes) {
        action(nodes[nodeKey]);
    };
}

/**
 * It would seem that using forEach on the map would be
 * better but that resulting in a non-deterministic result.
 */
export function visitMap(nodes: Map<string, ListNode>, action: Action): void {

    let unsortedKeys: Array<string> = [];
    for (let key of nodes.keys()) {
        unsortedKeys.push(key);
    }
    for (let key of unsortedKeys.sort()) {
        console.log(`visit map node: ${key}`);
        let node = nodes.get(key);
        if (typeof node === "undefined") { continue; }
        action(node);
    }

    /*
    nodes.forEach((node, _key, _map) => {
        action(node);
    });
    */
}