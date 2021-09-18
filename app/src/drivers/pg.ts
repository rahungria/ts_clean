import { IDB_Manager } from "../ports/db_manager_port";
import { Pool, PoolClient } from "pg";
import { ILogger } from "../ports/logger_port";


type PGDriverConfig = {
    user?: string,
    password?: string,
    host?: string,
    database?: string
}

export class PGDriver implements IDB_Manager{
    private pool: Pool;
    private logger: ILogger;

    constructor({user, password, host, database}: PGDriverConfig, logger: ILogger) {
        this.logger = logger;
        const _user = user || process.env.POSTGRES_USER
        const _password = password || process.env.POSTGRES_PASSWORD
        const _host = host || process.env.POSTGRES_HOST
        const _database = database || process.env.POSTGRES_DB

        this.logger.info(`connecting to postgresql://${_user}:*****@${_host}/${_database} ...`)
        try {
            this.pool = new Pool({
                user: _user,
                password: _password,
                host: _host,
                database: _database,
            });
            this.logger.info(`connected to postgresql://${_user}:*****@${_host}/${_database}`)
        } catch (error: any) {
            this.logger.fatal(`FAILED CONNECTION TO postgresql://${_user}:*****@${_host}/${_database}`)
            throw error
        }
    }

    public async get_connection() {
        this.logger.debug('getting connection from PSQL Pool')
        return await this.pool.connect();
    }

    public async close_connection(connection: PoolClient) {
        this.logger.debug('returning connection to PSQL Pool')
        return connection.release()
    }

    public async end() {
        this.logger.debug('Closing PSQL Pool')
        return await this.pool.end()
    }
}