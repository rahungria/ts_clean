import { IHashable } from "../../src/ports/hash_port";

export class MockHash implements IHashable {
    public async hash(data: string) {
        return data
    }

    public async compare(data: string, hashed: string) {
        return data === hashed;
    }
}
