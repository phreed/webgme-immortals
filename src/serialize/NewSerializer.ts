

export default class NewSerializer {
  constructor() {
  }
  static export(core: PluginJS.Core, libraryRoot: any, callback: any): void {
    console.error("export JSON library: not implemented");
  }
  static import(core: PluginJS.Core, originalLibraryRoot: any,
    updatedJsonLibrary: any, callback: any): void {
        console.error("import JSON library: not implemented");
    }
}
