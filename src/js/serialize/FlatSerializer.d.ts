


declare module 'serialize/FlatSerializer' {
  export default class FlatSerializer {
    constructor();
    static export(core: Core.Core, libraryRoot: any, callback: any): void;
    static import(core: Core.Core, originalLibraryRoot: any,
      updatedJsonLibrary: any, callback: any): void;
  }
}
