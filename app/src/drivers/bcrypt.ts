import bcrypt from "bcrypt";
import { IHashable } from "../ports/hash_port";


export class BcryptDriver implements IHashable{
    
    public async hash(data: string) {
        return await bcrypt.hash(data, 10);
    }

    public async compare(data: string, hash: string) {
        return await bcrypt.compare(data, hash);
    }
}
