import { PoolClient } from "pg";
import { User, UserType } from "../entity/user";
import { ILogger } from "../ports/logger_port";

export class UserRepository {
    private USER_TABLE = 'user_account'
    private connection: PoolClient;  // TODO abstract db connection (like PEP 249)
    private logger: ILogger;

    public constructor(connection: PoolClient, logger: ILogger) {
        this.connection = connection;
        this.logger = logger;
    }

    public async list_all({limit, offset}: {limit:number, offset:number}) {
        this.logger.debug(`[UserRepository] listing all users with 'limit':${limit} and 'offset':${offset}`)
        const { rows } = await this.connection.query(
            `SELECT * FROM ${this.USER_TABLE} LIMIT ${limit} OFFSET ${offset}`
        );
        const users = rows.map(row => new User(row));
        this.logger.debug(`[UserRepository] found users: ${users.map(u=>u.id)}`)
        return users;
    }

    public async insert_user(data: UserType) {
        this.logger.debug(`[UserRepository] creating user: '${data.username}'`)
        const { rows } = await this.connection.query(
            `INSERT INTO ${this.USER_TABLE}(username, password) values ($1, $2) RETURNING *;`,
            [data.username, data.password]
        );
        const user = new User(rows[0])
        this.logger.debug(`[UserRepository] created user#${user.id}`)
        return user;
    }

    public async retrieve_user_by_id(id: number) {
        this.logger.debug(`[UserRepository] fetching user#${id}`)
        const { rows } = (await this.connection.query(
            `SELECT * FROM ${this.USER_TABLE} WHERE id=$1`,
            [id]
        ));
        if (rows.length > 0){
            const user = new User(rows[0]);
            this.logger.debug(`[UserRepository] found user#${user.id}`)
            return user;
        }
        else{
            this.logger.debug(`[UserRepository] user#${id} not found`)
            return null;
        }
    }

    public async retrieve_user_by_username(username: string) {
        this.logger.debug(`[UserRepository] fetching user#${username}`)
        const { rows } = (await this.connection.query(
            `SELECT * FROM ${this.USER_TABLE} WHERE username=$1`,
            [username]
        ));
        if (rows.length > 0){
            const user = new User(rows[0]);
            this.logger.debug(`[UserRepository] found user#${user.id}`)
            return user;
        }
        else{
            this.logger.debug(`[UserRepository] user#${username} not found`)
            return null;
        }
    }

    public async count() {
        this.logger.debug(`[UserRepository] counting table ${this.USER_TABLE}`)
        const { rows } = await this.connection.query(
            `SELECT count(*) FROM ${this.USER_TABLE};`
        );
        const count = +rows[0].count as number;
        this.logger.debug(`[UserRepository] ${this.USER_TABLE} row count: ${count}`)
        return count
    }

    public async delete_user(id: number) {
        this.logger.debug(`[UserRepository] deleting user#${id}`)
        const { rowCount } = await this.connection.query(
            `DELETE FROM ${this.USER_TABLE} WHERE id=$1`,
            [id]
        );
        this.logger.debug(`[UserRepository] deleted ${rowCount} rows when trying to delete user#${id}`)
        return rowCount;
    }
}