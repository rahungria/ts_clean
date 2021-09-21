import { ILogger } from "../ports/logger_port";
import { IDB_Manager } from "../ports/db_manager_port";

import { UserRoleRepository } from "../repository/user_role_repository";

import { UserRole } from "../entity/user_role";


export class UserRoleController {

    private db: IDB_Manager
    private logger: ILogger

    constructor(db: IDB_Manager, logger: ILogger) {
        this.db = db
        this.logger = logger
    }

    public async list_roles({limit, offset}: {limit?: number, offset?: number}) {
        limit = limit || 10
        offset = offset || 0

        const con = await this.db.get_connection()
        try {
            const role_repo = new UserRoleRepository(con, this.logger)
            const roles = await role_repo.list_all_roles({limit, offset})

            const count = await role_repo.count() 
            if (limit < 1) limit = 1 
            if (offset < 0) offset = 0 
            if (offset > count) offset = count 

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
                roles: roles.map(role => role.to_json()), 
                next_page: (next.offset!=null) ? next : null, 
                prev_page: (prev.offset!=null) ? prev : null,
            }
            return res
        }
        catch (error: any) {
            this.logger.error(error)
            throw error
        }
        finally {
            this.db.close_connection(con)
        }
    }

    public async retrieve_role({id, name}: {id?:number, name?:string}) {
        if (!(id || name)) 
            return null
        const con = await this.db.get_connection()
        try {
            const role_repo = new UserRoleRepository(con, this.logger)
            let role: UserRole
            if (id)
                role = await role_repo.retrieve(id)
            else 
                role = await role_repo.retrieve_by_name(name)

            this.logger.debug(`Found Role '${role.name}'`)
            return role.to_json()
        }
        catch (error: any) {
            this.logger.error(error)
            throw error
        }
        finally {
            this.db.close_connection(con)
        }
    }

    public async create_role(name: string) {
        const con = await this.db.get_connection()
        try {
            con.query('BEGIN')

            const repo = new UserRoleRepository(con, this.logger)
            const role = await repo.create(name)

            con.query('COMMIT')
            return role.to_json() || null
        } 
        catch (error: any) {
            this.logger.error(error)
            con.query('ROLLBACK')
            throw error
        }
        finally {
            this.db.close_connection(con)
        }
    }
}