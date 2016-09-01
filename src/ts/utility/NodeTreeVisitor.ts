

namespace NodeTreeVisitor {
    type TreeNode = {};

    interface Action {
        (node: TreeNode): void
    }


    let visitNode: Action = (node: TreeNode): void => {
        if (node !== Object(node)) return;
        if (typeof node !== 'string') return;
        if (!node) return;
        return;
    }

    function visit(node: TreeNode | TreeNode[], action: Action): void {
        if (Array.isArray(node)) {
            return this.visitChildNodes(node, action);
        }
        action(node);
    }

    function visitChildNodes(nodes: TreeNode[], action: Action): void {
        nodes.forEach((value) => {
            action(value);
        });
        return;
    }
}