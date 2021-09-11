import { User, UserType } from "../entity/user";
import { IDB_Manager } from "../ports/db_manager_port";
import { IHashable } from "../ports/hash_port";
import { UserRepository } from "../repository/user_repository";


export class UserController {
    private hash: IHashable;
    private db: IDB_Manager;

    public constructor(db_manager: IDB_Manager, hash: IHashable) {
        this.db = db_manager;
        this.hash = hash;
    }


    public async list_users({limit, offset}: {limit:number, offset:number}) {
        const con = await this.db.get_connection();
        console.log(con)
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
                next: (next.limit!=null && next.offset!=null) ? next : null, 
                prev: (prev.limit!=null && prev.offset!=null) ? prev : null,
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
            const users = await user_repo.insert_user(data);
            if (users) {
                await connection.query('COMMIT');
                return users.map(user => user.to_json());
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
                return (await user_repo.retrieve_user_by_id(id)).map(user => user.to_json());
            else if (username)
                return (await user_repo.retrieve_user_by_username(username)).map(user => user.to_json());
            else
                return null
        }
        finally {
            con.release() 
        }
    } 
}
