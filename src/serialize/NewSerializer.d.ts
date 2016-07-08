declare module 'serialize/NewSerializer' {
  export default class NewSerializer {
    constructor();
    static export(core: any, libraryRoot: any, callback: any): void;
    static import(core: any, originalLibraryRoot: any, updatedJsonLibrary: any, callback: any): void;
  }
}
