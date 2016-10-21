declare module 'serialize/CyjsSerializer' {
  export default class CyjsSerializer {
    constructor();
    static export(core: any, libraryRoot: any, callback: any): void;
    static import(core: any, originalLibraryRoot: any,
                  updatedJsonLibrary: any, callback: any): void;
  }
}
