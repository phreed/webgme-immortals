

export function attrToString(attr: Common.OutAttr): string {
    if (typeof attr !== "string") {
        throw new Error("attribute value is not a string");
    }
    return attr;
}

export function pathToString(path: Common.OutPath): string | boolean {
    if (path === null) {
        return false;
    }
    if (typeof path === "string") {
        return path;
    }
    switch (typeof path) {
        case "object":
            throw new Error(`path value is an object: ${Object.keys(path)}`);
        case "undefined":
            throw new Error("path value is undefined");
        default:
            throw new Error(`path value is not a string: but ${typeof path}`);
    }
}

