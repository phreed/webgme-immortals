
export class NewSerializer {
    constructor() {
    }

    static export(_core: PluginJS.Core, _libraryRoot: any, callback: any): void {
        console.error("export JSON library with NewSerializer: not implemented");
        throw new Error("export JSON library with NewSerializer: not implemented");
    }

    static import(_core: PluginJS.Core, _originalLibraryRoot: any,
        _updatedJsonLibrary: any, callback: any): void {
        console.error("import JSON library with NewSerializer: not implemented");
        throw new Error("import JSON library with NewSerializer: not implemented");
    }
}

