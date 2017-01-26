
export class NewSerializer {
    constructor() {
    }

    static export(_core: GmeClasses.Core, _libraryRoot: any): Promise<any> {
        console.error("export JSON library with NewSerializer: not implemented");
        throw new Error("export JSON library with NewSerializer: not implemented");
    }

    static import(_core: GmeClasses.Core, _originalLibraryRoot: any,
        _updatedJsonLibrary: any): Promise<any> {
        console.error("import JSON library with NewSerializer: not implemented");
        throw new Error("import JSON library with NewSerializer: not implemented");
    }
}

