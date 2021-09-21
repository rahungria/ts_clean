import { UserController } from '../src/controller/user_controller';

import { PGDriver } from '../src/drivers/pg';
import { BcryptDriver } from '../src/drivers/bcrypt'
import { DefaultLogger } from '../src/drivers/logger'
import { RedisSessionManager } from '../src/drivers/redis_session'

import { MockHash } from './mock_drivers/hash_mock';
import { MockPSQL } from "./mock_drivers/psql_mock";
import { MockRedisSession } from './mock_drivers/redis_session_mock';

import { ILogger } from '../src/ports/logger_port';
import { IHashable } from '../src/ports/hash_port';
import { IDB_Manager } from '../src/ports/db_manager_port';
import { ISessionManager } from '../src/ports/session_manager_port';

import path from 'path';


const random_user = () => {
    return {
        username: 'test_username',
        password: 'test_password'
    }
}


describe('UserController Tests', () => {
    let db: IDB_Manager
    let redis: ISessionManager
    let hash: IHashable
    let user_controller: UserController
    let logger: ILogger
    let user: any

    beforeAll(() => {
        logger = new DefaultLogger({
            mirror_stdout: false,
            log_root: path.join(path.resolve(__dirname), 'logs'),
            log_identifier: 'UserController.test',
            log_level: 'debug'
        })
        db = new PGDriver({host: process.env.POSTGRES_TEST_HOST}, logger);
        redis = new MockRedisSession();
        // hash = new MockHash();
        hash = new BcryptDriver(logger);

        user_controller = new UserController(db, hash, redis, logger);
        user = random_user();

    })
    afterAll(async () => {
        const c = await db.get_connection()
        await c.query('delete from user_account;')
        await db.close_connection(c)
        await db.end()
    })
    

    test('Create User with Default Role', async () => {
        expect.assertions(3);
        const created_user = await user_controller.create_new_user(user)
        expect(created_user.username).toBe(user.username)
        expect(created_user.id).toBeDefined()
        expect(created_user.role).toEqual({id: 1, name: 'BASE_ROLE'})
        user.id = created_user.id
        user.role = created_user.role
    })

    test('Create User with repeated username', async () => {
        expect.assertions(1)
        const res = await user_controller.create_new_user(user)
        expect(res).toBeFalsy()
    })

    test('Retrieve User by ID', async () => {
        expect.assertions(3)
        const res = await user_controller.retrieve_user({id: user.id})
        expect(res.id).toEqual(user.id)
        expect(res.username).toEqual(user.username)
        expect(res.role).toEqual({id:1, name:'BASE_ROLE'})
    })

    test('Retrieve User by Username', async () => {
        expect.assertions(3)
        const res = await user_controller.retrieve_user({username: user.username})
        expect(res.id).toEqual(user.id)
        expect(res.username).toEqual(user.username)
        expect(res.role).toEqual({id:1, name:'BASE_ROLE'})
    })

    test('Retrieve User without enough params', async () => {
        expect.assertions(1)
        const res = await user_controller.retrieve_user({})
        expect(res).toBeNull()
    })

    test('List All Users', async () => {
        expect.assertions(4)
        const res = await user_controller.list_users({limit:10, offset:0})
        expect(res.count).toBe(1)
        expect(res.next_page).toBeNull()
        expect(res.prev_page).toBeNull()
        expect(res.users).toEqual(expect.arrayContaining([{username: user.username, id:user.id, role: user.role}]))
    })

    test('Authenticate User', async () => {
        expect.assertions(3)
        // right password given
        const res = await user_controller.authenticate_user(user)
        expect(res).toBeTruthy()
        expect(res.id).toBe(user.id)
        expect(res.username).toBe(user.username)
    })

    test('Authenticate User with Wrong Password', async () => {
        expect.assertions(1)
        const fail = await user_controller.authenticate_user({username: user.username, password: 'wrong_password'})
        expect(fail).toBeNull()
    })

    test('Authenticate User with Wrong Username', async () => {
        expect.assertions(1)
        const fail = await user_controller.authenticate_user({username: user.username+'_wrong', password: user.password})
        expect(fail).toBeNull()
    })

    test('Delete User', async () => {
        expect.assertions(2)
        const res = await user_controller.delete_user(user.id);
        expect(res).toBe(1)

        // determine if user was deleted after all
        const check = await user_controller.retrieve_user({id:user.id})
        expect(check).toBeNull()
    })
})
