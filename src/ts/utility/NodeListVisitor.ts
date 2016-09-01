


export type ListNode = {};

export interface Action {
    (node: ListNode): void
}

export let visitNode: Action = (node: ListNode): void => {
    if (node !== Object(node)) return;
    if (typeof node !== 'string') return;
    if (!node) return;
    return;
}

export function visit(nodes: {[guid: string]: ListNode}, action: Action): void {
    for (let nodeKey in nodes) {
        action(nodes[nodeKey]);
    };
}