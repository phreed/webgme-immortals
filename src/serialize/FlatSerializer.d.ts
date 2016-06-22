

declare module 'serialize/FlatSerializer' {
  export default class FlatSerializer {
    constructor();
    static export(core: any, libraryRoot: any, callback: any): void;
    static import(core: any, originalLibraryRoot: any,
      updatedJsonLibrary: any, callback: any): void;
  }
}
