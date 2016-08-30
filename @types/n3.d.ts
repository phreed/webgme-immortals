

declare namespace N3 {

    type ErrorCallback = (err: Error, result: any) => void;

    interface Dictionary {

    }

    interface Triple {
        subject: string,
        predicate: string,
        object: string
    }

    class WriterImpl {
        constructor(options: any);

        addTriple(subject: string, predicate: string, object: string): void;
        addTriple(triple: Triple): void;
        end(err: ErrorCallback): void;
    }

    interface Options {
        format?: string,
        prefixes?: any
    }
    function Writer(options: Options): WriterImpl;
    function Writer(fd: any, options: Options): WriterImpl;
}

declare module "n3" {
    export = N3;
}
