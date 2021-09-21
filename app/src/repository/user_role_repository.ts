import { PoolClient } from "pg";
import { UserRole } from "../entity/user_role";
import { ILogger } from "../ports/logger_port";

export class UserRoleRepository {

    public USER_ROLE_TABLE = 'user_role'
    private con: PoolClient
    private logger: ILogger
    public constructor(con: PoolClient, logger: ILogger) {
        this.con = con
        this.logger = logger
    }

    public async list_all_roles({limit, offset}: {limit:number, offset:number}) {
        this.logger.debug(`Listing all user roles`)
        const { rows } = await this.con.query(
            `SELECT * FROM ${this.USER_ROLE_TABLE}
            LIMIT ${limit} OFFSET ${offset}`
        )
        this.logger.debug(`Listed ${rows.length} UserRoles`)
        const roles = rows.map(row => new UserRole(row))
        return roles
    }    

    public async retrieve(id: number) {
        this.logger.debug(`Retrieving UserRole#${id}`)
        const { rows } = await this.con.query(
            `SELECT * FROM ${this.USER_ROLE_TABLE}
            WHERE id=$1`,
            [id]
        )

        const role = new UserRole(rows[0])
        this.logger.debug(`Retrieved role: '${role.name}'`)
        return role
    }

    public async retrieve_by_name(name: string) {
        this.logger.debug(`Retrieving UserRole '${name}'`)
        const { rows } = await this.con.query(
            `SELECT * FROM ${this.USER_ROLE_TABLE}
            WHERE name=$1`,
            [name]
        )

        const role = new UserRole(rows[0])
        this.logger.debug(`Retrieved role: '${role.name}'`)
        return role
    }

    public async create(name: string) {
        this.logger.debug(`Creating new UserRole '${name}'`)
        const { rows } = await this.con.query(
            `INSERT INTO ${this.USER_ROLE_TABLE}(name)
            VALUES ($1)
            RETURNING *`,
            [name]
        )

        const role = new UserRole(rows[0])
        this.logger.debug(`Created role: '${role.name}'`)
        return role
    }

    public async count() {
        this.logger.debug('Counting User Roles')
        const { rows } = await this.con.query(
            `SELECT count(*) FROM ${this.USER_ROLE_TABLE};`
        )
        return +rows[0].count as number
    }
}