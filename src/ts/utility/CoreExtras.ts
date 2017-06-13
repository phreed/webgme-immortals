


/**
 * It may be that the node was formed outside of GME.
 * In that case the GUID is already defined and to
 * change it in GME is unreasonable.
 * When this is the case the GUID is stored on the
 * FCO as an attribute named 'extguid'.
 */
export function getCoreGuid(core: GmeClasses.Core, node: Core.Node | null): string {
    let attr = core.getAttribute(node, "@extguid");
    if (typeof attr !== "string") {
        return core.getGuid(node);
    }
    if (attr.length > 0) {
        return attr;
    }
    return core.getGuid(node);
}