import { UserType } from "../entity/user";
import { ILogger } from "../ports/logger_port";
import { IHashable } from "../ports/hash_port";
import { IDB_Manager } from "../ports/db_manager_port";
import { ISessionManager } from "../ports/session_manager_port";
import { UserRepository } from "../repository/user_repository";


export class UserController {
    private hash: IHashable;
    private db: IDB_Manager;
    private session: ISessionManager;
    private logger: ILogger;

    public constructor(db_manager: IDB_Manager, hash: IHashable, session: ISessionManager, logger: ILogger) {
        this.db = db_manager;
        this.hash = hash;
        this.session = session;
        this.logger = logger;
        this.logger.debug('[UserController] initializing User Controller')
    }


    public async list_users({limit, offset}: {limit:number, offset:number}) {
        const con = await this.db.get_connection();
        try {
            this.logger.info('[UserController] Listing users')
            const user_repo = new UserRepository(con, this.logger);
            const users = (await user_repo.list_all({limit, offset})).map(user => user.to_json());
            
            const count = await user_repo.count();
            if (limit < 1) limit = 1;
            if (offset < 0) offset = 0;
            if (offset > count) offset = count;

            const next = {
                limit: limit,
                offset: (offset+limit<count) ? offset+limit :null
            }
            const prev = {
                limit: limit,
                offset: (offset<=0) ? null: (offset-limit<0) ? 0 : offset-limit
            }

            const res = { 
                count, 
                users, 
                next_page: (next.limit!=null && next.offset!=null) ? next : null, 
                prev_page: (prev.limit!=null && prev.offset!=null) ? prev : null,
            }
            this.logger.debug(`[UserController] Users list returned ${res.count} users`)
            return res
        }
        catch (error: any) {
            this.logger.error(`[UserController] Failed listing errors: ${error}`)
            throw error
        }
        finally {
            this.db.close_connection(con)
        }
    }

    public async create_new_user(data: UserType) {
        this.logger.info(`[UserController] Creating user: ${data.username}`)
        const connection = await this.db.get_connection();
        try {
            const user_repo = new UserRepository(connection, this.logger);
            await connection.query('BEGIN');
            const hashed = await this.hash.hash(data.password);
            try { 
                const user = await user_repo.insert_user({username: data.username, password:hashed});
                await connection.query('COMMIT');
                return user?.to_json();
            }
            catch (error: any) {
                this.logger.error(`[UserController] Failed Creating user#${data.username} ${error}`)
                await connection.query('ROLLBACK')
                return null
            }
        }
        finally {
            this.db.close_connection(connection)
        }
    }

    public async retrieve_user({id, username}: {id?:number, username?:string}){
        this.logger.info(`[UserController] Retrieving user#${id || username}`)
        const con = await this.db.get_connection();
        try {
            const user_repo = new UserRepository(con, this.logger);
            if (id) 
                return (await user_repo.retrieve_user_by_id(id))?.to_json();
            else if (username)
                return (await user_repo.retrieve_user_by_username(username))?.to_json();
            else{
                this.logger.error('[UserController] Tried retrieving user with no params given...')
                return null
            }
        }
        finally {
            this.db.close_connection(con)
        }
    }

    public async authenticate_user(data: UserType) {
        this.logger.info(`[UserController] Auth user#${data.username}`)
        const con = await this.db.get_connection();
        try {
            const user_repo = new UserRepository(con, this.logger);
            const user = await user_repo.retrieve_user_by_username(data.username);
            if (!user)
                return null

            this.logger.debug(`[UserController] Matching credentials for user#${user.id}`)
            const match = await this.hash.compare(data.password, user.password);
            if (match){
                const start_session = await this.session.start_user_session(user, 300)
                if (start_session){
                    this.logger.debug(`[UserController] Auth user#${user.id} success`)
                    return user.to_json()
                }
                else {
                    this.logger.error(`[UserController] Failed starting user session for user#${user.id}`)
                    return null
                }
            }
            else {
                this.logger.debug(`[UserController] credential '${data.password}' didn't match user#${user.id}`)
                return null
            }
        } 
        finally {
            this.db.close_connection(con)
        }
    }

    public async delete_user(id: number) {
        this.logger.info(`[UserController] deleting user#${id}`)
        const con = await this.db.get_connection();
        try {
            const user_repo = new UserRepository(con, this.logger);
            const r = await user_repo.delete_user(id);
            return r;
        } 
        catch (error: any) {
            this.logger.error(`[UserController] Failed deleting user#${id}: ${error}`)
            throw error
        }
        finally {
            this.db.close_connection(con)
        }
    }
}
