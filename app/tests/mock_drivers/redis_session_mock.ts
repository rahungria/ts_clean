import { User } from "../../src/entity/user";
import { ISessionManager } from "../../src/ports/session_manager_port";

export class MockRedisSession implements ISessionManager {
    
    private list: object

    constructor() {
        this.list = {}
    }

    public async start_user_session(user: User, timeout: number) {
        if (user.id) {
            this.list[`user:${user.id}`] = 1
            return true
        }
        else
            return false
    }

    public async end_user_session(user: User) { 
        if (user.id) {
            return delete this.list[`user:${user.id}`];
        }
        else 
            return false
    }
}
