import { TedisPool } from 'tedis';
import { User } from '../entity/user';
import { ILogger } from '../ports/logger_port';
import { ISessionManager } from '../ports/session_manager_port';


export class RedisSessionManager implements ISessionManager {

    private pool: TedisPool;
    private logger: ILogger;

    public constructor(logger: ILogger) {
        this.logger = logger;
        this.logger.info(`connecting to Redis@${process.env.REDIS_HOST}`)
        try {
            this.pool = new TedisPool({
                host: process.env.REDIS_HOST,
            });
        } catch(error: any) {
            this.logger.fatal(`FAILED CONNECTION to Redis@${process.env.REDIS_HOST}`)
            throw error
        }
    }

    public async start_user_session(user: User, timeout: number) {
        this.logger.debug(`starting a user session: ${{user: user.id, timeout}}`)
        const con = await this.pool.getTedis();
        try {
            if (user.id){
                const res = con.setex(`user:${user.id}`, timeout || 300, '1');
                this.logger.debug(`started session successfully: ${{user:user.id, timeout}}`)
                return res != null;
            }
            else {
                this.logger.error(`user with no id passed to start session`)
                return false;
            }
        }
        finally {
            this.pool.putTedis(con);
        }
    }

    public async end_user_session(user: User) {
        this.logger.debug(`starting a user session: ${{user: user.id}}`)
        const con = await this.pool.getTedis();
        try {
            if (user.id != null) {
                const res = await con.del(`user:${user.id}`);
                this.logger.debug(`ended session successfully: ${{user:user.id}}`)
                return Boolean(res);
            }
            else {
                this.logger.error(`user with no id passed to end session`)
                return false;
            }
        }
        finally {
            this.pool.putTedis(con);
        }
    }
}
