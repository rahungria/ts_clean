import { PoolClient } from "pg";
import { User, UserType } from "../entity/user";

export class UserRepository {
    private USER_TABLE = 'user_account'
    private connection: PoolClient;  // TODO abstract db connection (like PEP 249)

    public constructor(connection: PoolClient) {
        this.connection = connection;
    }

    public async list_all({limit, offset}: {limit:number, offset:number}) {
        const { rows } = await this.connection.query(
            `SELECT * FROM ${this.USER_TABLE} LIMIT ${limit} OFFSET ${offset}`
        );
        return rows.map(row => new User(row));
    }

    public async insert_user(data: UserType) {
        const { rows } = await this.connection.query(
            `INSERT INTO ${this.USER_TABLE}(username, password) values ($1, $2) RETURNING *;`,
            [data.username, data.password]
        );
        return rows.map(row => new User(row));
    }

    public async retrieve_user_by_id(id: number) {
        const { rows } = (await this.connection.query(
            `SELECT * FROM ${this.USER_TABLE} WHERE id=$1`,
            [id]
        ));
        return rows.map(row => new User(row));
    }

    public async retrieve_user_by_username(username: string) {
        const { rows } = (await this.connection.query(
            `SELECT * FROM ${this.USER_TABLE} WHERE username=$1`,
            [username]
        ));
        return rows.map(row => new User(row));
    }

    public async count() {
        const { rows } = await this.connection.query(
            `SELECT count(*) FROM ${this.USER_TABLE};`
        );
        return +rows[0].count as number;
    }
}