import { UserType } from "../entity/user";
import { IDB_Manager } from "../ports/db_manager_port";
import { IHashable } from "../ports/hash_port";
import { ISessionManager } from "../ports/session_manager_port";
import { UserRepository } from "../repository/user_repository";


export class UserController {
    private hash: IHashable;
    private db: IDB_Manager;
    private session: ISessionManager;

    public constructor(db_manager: IDB_Manager, hash: IHashable, session: ISessionManager) {
        this.db = db_manager;
        this.hash = hash;
        this.session = session;
    }


    public async list_users({limit, offset}: {limit:number, offset:number}) {
        const con = await this.db.get_connection();
        try {
            const user_repo = new UserRepository(con);
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

            return { 
                count, 
                users, 
                next_page: (next.limit!=null && next.offset!=null) ? next : null, 
                prev_page: (prev.limit!=null && prev.offset!=null) ? prev : null,
            }
        }
        finally {
            con.release();
        }
    }

    public async create_new_user(data: UserType) {
        const connection = await this.db.get_connection();
        try {
            const user_repo = new UserRepository(connection);
            await connection.query('BEGIN');
            data.password = await this.hash.hash(data.password);
            const user = await user_repo.insert_user(data);
            if (user) {
                await connection.query('COMMIT');
                return user.to_json();
            }
            else {
                await connection.query('ROLLBACK');
                return null;
            }
        }
        finally {
            connection.release();
        }
    }

    public async get_count() {
        const con = await this.db.get_connection();
        try {
            const user_repo = new UserRepository(con);
            return await user_repo.count();
        }
        finally {
            con.release()
        }
    }

    public async retrieve_user({id, username}: {id?:number, username?:string}){
        const con = await this.db.get_connection();
        try {
            const user_repo = new UserRepository(con);
            if (id) 
                return (await user_repo.retrieve_user_by_id(id))?.to_json();
            else if (username)
                return (await user_repo.retrieve_user_by_username(username))?.to_json();
            else
                return null
        }
        finally {
            con.release() 
        }
    }

    public async authenticate_user(data: UserType) {
        const con = await this.db.get_connection();
        try {
            const user_repo = new UserRepository(con);
            const user = await user_repo.retrieve_user_by_username(data.username);
            if (!user)
                return null

            const match = await this.hash.compare(data.password, user.password);

            if (match && await this.session.start_user_session(user, 300)){
                return user.to_json();
            }
            else
                return null
        } 
        finally {
            con.release();
        }
    }
}
