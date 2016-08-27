

declare namespace n3 {

    type ErrorCallback = (err: Error, result: any) => void;

    interface Dictionary {

    }

    interface Triple {
        subject: string,
        predicate: string,
        object: string
    }

    class Writer {
        constructor(options: any);

        addTriple(subject: string, predicate: string, object: string): void;
        addTriple(triple: Triple): void;
        end(err: ErrorCallback): void;
    }
}

declare module "n3" {
    export = n3;
}
