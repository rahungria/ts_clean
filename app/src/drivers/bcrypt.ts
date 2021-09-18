import bcrypt from "bcrypt";
import { IHashable } from "../ports/hash_port";
import { ILogger } from "../ports/logger_port";


export class BcryptDriver implements IHashable{

    private logger: ILogger;
    public constructor(logger: ILogger){
        this.logger = logger;
    }
    
    public async hash(data: string) {
        this.logger.debug(`using bcrypt to hash '${data}'`)
        return await bcrypt.hash(data, 10);
    }

    public async compare(data: string, hash: string) {
        this.logger.debug(`using bcrypt to compare '${data}' with hash 'REDACTED'`)
        return await bcrypt.compare(data, hash);
    }
}
