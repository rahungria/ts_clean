import { IDB_Manager } from "../ports/db_manager_port";
import { Pool, PoolClient } from "pg";

export class PGDriver implements IDB_Manager{
    private pool: Pool;

    constructor() {
        this.pool = new Pool({
            user: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            host: process.env.POSTGRES_HOST,
            database: process.env.POSTGRES_DB
        });
    }

    public async get_connection() {
        return await this.pool.connect();
    }

    public async close_connection(connection: PoolClient) {
        return connection.release()
    }

    public async end() {
        return await this.pool.end()
    }
}