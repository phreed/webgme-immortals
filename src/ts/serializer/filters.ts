

export enum PruningFlag {
    None     = 0,
    Library  = 1 << 0,
    Header   = 1 << 1,
}

export class PruningCondition {
    constructor() {
        this.flag = PruningFlag.None;
        this.cond = false;
    }
    flag: PruningFlag;
    cond: boolean;
}