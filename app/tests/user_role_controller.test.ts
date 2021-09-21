import path from "path/posix"

import { UserRoleController } from '../src/controller/user_role_controller'

import { DefaultLogger } from "../src/drivers/logger"
import { PGDriver } from "../src/drivers/pg"

import { UserRole } from "../src/entity/user_role"

import { IDB_Manager } from "../src/ports/db_manager_port"
import { ILogger } from "../src/ports/logger_port"


describe('UserRoleController Tests', () => {

    let logger: ILogger
    let db: IDB_Manager
    let controller: UserRoleController
    let role: any

    beforeAll(() => {
        logger = new DefaultLogger({
            mirror_stdout: false,
            log_root: path.join(path.resolve(__dirname), 'logs'),
            log_identifier: 'UserRoleController.test',
            log_level: 'debug'
        })
        db = new PGDriver({host: process.env.POSTGRES_TEST_HOST}, logger)
        controller = new UserRoleController(db, logger)
    })
    afterAll(async () => {
        const c = await db.get_connection()
        await c.query('DELETE FROM user_role WHERE id!=1 and id!=2')
        await db.close_connection(c)
        await db.end()
    })

    test('DB with Inital Base Roles', async () => {
        expect.assertions(5)

        const roles = await controller.list_roles({limit:10, offset:0})
        expect(roles.count).toEqual(2)
        expect(roles.next_page).toBeNull()
        expect(roles.prev_page).toBeNull()
        expect(roles.roles[0]).toEqual({id:1, name:'BASE_ROLE'})
        expect(roles.roles[1]).toEqual({id:2, name:'ADMIN_ROLE'})
    })

    test('Create New Role', async () => {
        expect.assertions(1)
        
        const _role = await controller.create_role('TEST_ROLE')
        expect(_role.name).toBe('TEST_ROLE')
        role = _role
    })

    test('Retrieve the Created Role', async () => {
        expect.assertions(4)

        const _role = await controller.retrieve_role({id:role.id})
        expect(_role.name).toBe('TEST_ROLE')
        expect(_role.id).toBe(role.id)

        const __role = await controller.retrieve_role({name: 'TEST_ROLE'})
        expect(__role.name).toBe('TEST_ROLE')
        expect(__role.id).toBe(role.id)
    })
})
