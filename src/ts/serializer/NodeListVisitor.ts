


export type ListNode = {};

export interface Action {
    (node: ListNode): void;
}

export function visit(nodes: { [guid: string]: ListNode }, action: Action): void {
    for (let nodeKey in nodes) {
        action(nodes[nodeKey]);
    };
}

export function visitMap(nodes: Map<string, ListNode>, action: Action): void {
    nodes.forEach((value, _key, _map) => {
        action(value);
    });
}