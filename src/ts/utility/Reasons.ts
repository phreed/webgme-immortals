
export interface Rule {
    parent: Core.Node;
    child: Core.Node;
}

/**
 * Suppose:
 B inherits from A
 D inherits from C
 A has a rule allowing it to contain C.
 Given D and B this function returns the rule
 that allows the containment of D by B,
 specifically it returns C and A.
 */

export function whyIsValidChildOf(core: GmeClasses.Core, child: Core.Node, parent: Core.Node): Rule | null {
    if (!core.isValidChildOf(child, parent)) {
        return null;
    }
    let lastChild = child;
    let nextChild: Core.Node | null = child;
    while (nextChild) {
        if (!core.isValidChildOf(nextChild, parent)) {
            break;
        }
        lastChild = nextChild;
        nextChild = core.getBase(nextChild);
    }

    let lastParent = parent;
    let nextParent: Core.Node | null = parent;
    while (nextParent) {
        if (!core.isValidChildOf(nextParent, parent)) {
            break;
        }
        lastParent = nextParent;
        nextParent = core.getBase(nextParent);
    }
    return { parent: lastParent, child: lastChild };
}


