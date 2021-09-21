import { PoolClient } from "pg" 

import { User, UserType } from "../entity/user" 
import { UserRole } from "../entity/user_role" 

import { ILogger } from "../ports/logger_port" 

import { UserRoleRepository } from "./user_role_repository" 


export class UserRepository {
    
    public USER_TABLE = 'user_account'
    private USER_ROLE_TABLE = 'user_role'
    private connection: PoolClient   // TODO abstract db connection (like PEP 249)
    private logger: ILogger 
    private user_role_repo: UserRoleRepository

    public constructor(connection: PoolClient, logger: ILogger, user_role_repo: UserRoleRepository) {
        this.connection = connection 
        this.logger = logger 
        this.user_role_repo = user_role_repo
    }

    public async list_all({limit, offset}: {limit:number, offset:number}) {
        this.logger.debug(`[UserRepository] listing all users with 'limit':${limit} and 'offset':${offset}`)
        const { rows } = await this.connection.query(
            `SELECT 
                u.id as id,
                u.username as username,
                u.password as password,
                r.id as role_id,
                r.name as role_name
            FROM ${this.USER_TABLE} as u
            LEFT JOIN ${this.user_role_repo.USER_ROLE_TABLE} as r
            ON u.user_role_id = r.id
            LIMIT ${limit} OFFSET ${offset}`
        )
        const users = rows.map(row => {
            const role = new UserRole({id: row.role_id, name: row.role_name})
            return new User({id: row.id, username: row.username, password: row.password, role: role})
        })
        this.logger.debug(`[UserRepository] found users: ${(users.map(u=>u.id)).toString()}`)
        return users
    }

    public async insert_user(data: UserType) {
        this.logger.debug(`[UserRepository] creating user: '${data.username}'`)
        const { rows } = await this.connection.query(
            `INSERT INTO ${this.USER_TABLE}(username, password) values ($1, $2) RETURNING * `,
            [data.username, data.password]
        ) 
        const role = await this.user_role_repo.retrieve(rows[0].user_role_id)
        const user = new User({
            id: rows[0].id, username: rows[0].username,
            password: rows[0].password, role: role
        })
        this.logger.debug(`[UserRepository] created user#${user.id}`)
        const joined_user = await this.retrieve_user_by_id(user.id!)
        return joined_user 
    }

    public async retrieve_user_by_id(id: number) {
        this.logger.debug(`[UserRepository] fetching user#${id}`)
        const { rows } = (await this.connection.query(
            `SELECT 
                u.id as id,
                u.username as username,
                u.password as password, 
                r.id as role_id,
                r.name as role_name
            FROM ${this.USER_TABLE} as u
            LEFT JOIN ${this.user_role_repo.USER_ROLE_TABLE}  as r
            ON u.user_role_id = r.id
            WHERE u.id=$1`,
            [id]
        )) 
        if (rows.length > 0){
            const data = rows[0]
            const role = new UserRole({id: data.role_id, name: data.role_name})
            const user = new User({
                id: data.id, username: data.username,
                password: data.password, role: role
            })
            this.logger.debug(`[UserRepository] found user#${user.id}`)
            return user 
        }
        else{
            this.logger.debug(`[UserRepository] user#${id} not found`)
            return null 
        }
    }

    public async retrieve_user_by_username(username: string) {
        this.logger.debug(`[UserRepository] fetching user#${username}`)
        const { rows } = (await this.connection.query(
            `SELECT 
                u.id as id,
                u.username as username,
                u.password as password,
                r.id as role_id,
                r.name as role_name
            FROM ${this.USER_TABLE} as u
            LEFT JOIN ${this.user_role_repo.USER_ROLE_TABLE} as r
            ON u.user_role_id = r.id
            WHERE u.username=$1`,
            [username]
        )) 
        if (rows.length > 0){
            const data = rows[0]
            const role = new UserRole({id: data.role_id, name: data.role_name})
            const user = new User({
                id: data.id, username: data.username,
                password: data.password, role: role
            })
            this.logger.debug(`[UserRepository] found user#${user.id}`)
            return user
        }
        else{
            this.logger.debug(`[UserRepository] User '${username}' not found`)
            return null
        }
    }

    public async count() {
        this.logger.debug(`[UserRepository] counting table ${this.USER_TABLE}`)
        const { rows } = await this.connection.query(
            `SELECT count(*) FROM ${this.USER_TABLE} `
        ) 
        const count = +rows[0].count as number 
        this.logger.debug(`[UserRepository] ${this.USER_TABLE} row count: ${count}`)
        return count
    }

    public async delete_user(id: number) {
        this.logger.debug(`[UserRepository] deleting user#${id}`)
        const { rowCount } = await this.connection.query(
            `DELETE FROM ${this.USER_TABLE} WHERE id=$1`,
            [id]
        ) 
        this.logger.debug(`[UserRepository] deleted ${rowCount} rows when trying to delete user#${id}`)
        return rowCount 
    }
}