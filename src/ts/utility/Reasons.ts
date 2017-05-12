
export interface Rule {
    parent: Core.Node;
    child: Core.Node;
}

/**
 * Suppose:
 B inherits from A
 D inherits from C
 A has a rule allowing it to contain C.
 Given D, the child, and B, the parent,
 this function returns the rule
 that allows the containment of D by B,
 specifically it returns C, the child, and A, the parent.
 */
export function explainGenealogy(core: GmeClasses.Core, child: Core.Node, parent: Core.Node): Rule | null {
    if (!core.isValidChildOf(child, parent)) {
        return null;
    }
    let priorChild = child;
    let nextChild: Core.Node | null = child;
    while (nextChild) {
        if (!core.isValidChildOf(nextChild, parent)) {
            break;
        }
        priorChild = nextChild;
        nextChild = core.getBase(nextChild);
    }

    let priorParent = parent;
    let nextParent: Core.Node | null = parent;
    while (nextParent) {
        if (!core.isValidChildOf(priorChild, nextParent)) {
            break;
        }
        priorParent = nextParent;
        nextParent = core.getBase(nextParent);
    }
    return { parent: priorParent, child: priorChild };
}


