import { TedisPool } from 'tedis';
import { User } from '../entity/user';
import { ISessionManager } from '../ports/session_manager_port';


export class RedisSessionManager implements ISessionManager {

    private pool: TedisPool;

    public constructor() {
        this.pool = new TedisPool({
            host: process.env.REDIS_HOST,
        });
    }

    public async start_user_session(user: User, timeout: number) {
        const con = await this.pool.getTedis();
        try {
            if (user.id){
                const res = con.setex(`user:${user.id}`, timeout || 300, '1');
                return res != null;
            }
            else
                return false;
        }
        finally {
            this.pool.putTedis(con);
        }
    }

    public async end_user_session(user: User) {
        const con = await this.pool.getTedis();
        try {
            if (user.id != null) {
                const res = await con.del(`user:${user.id}`);
                return Boolean(res);
            }
            else 
                return false;
        }
        finally {
            this.pool.putTedis(con);
        }
    }
}
