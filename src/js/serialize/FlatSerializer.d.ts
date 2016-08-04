


declare module 'serialize/FlatSerializer' {
  export default class FlatSerializer {
    constructor();
    static export(core: PluginJS.Core, libraryRoot: any, callback: any): void;
    static import(core: PluginJS.Core, originalLibraryRoot: any,
      updatedJsonLibrary: any, callback: any): void;
  }
}
