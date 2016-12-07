
export class NewSerializer {
    constructor() {
    }

    static export(_core: GmeClasses.Core, _libraryRoot: any, callback: any): void {
        if (callback) {
            console.error("callback is provided");
        }
        console.error("export JSON library with NewSerializer: not implemented");
        throw new Error("export JSON library with NewSerializer: not implemented");
    }

    static import(_core: GmeClasses.Core, _originalLibraryRoot: any,
        _updatedJsonLibrary: any, callback: any): void {
        if (callback) {
            console.error("callback is provided");
        }
        console.error("import JSON library with NewSerializer: not implemented");
        throw new Error("import JSON library with NewSerializer: not implemented");
    }
}

