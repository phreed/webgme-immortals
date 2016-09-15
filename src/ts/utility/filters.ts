

export enum PruningFlag {
    None     = 0,
    Library  = 1 << 0
}

export class PruningCondition {
    constructor() {
        this.flag = PruningFlag.None;
        this.cond = false;
    }
    flag: PruningFlag;
    cond: boolean;
}