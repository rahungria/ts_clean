import { UserController } from '../src/controller/user_controller';

import { BcryptDriver } from '../src/drivers/bcrypt'
import { RedisSessionManager } from '../src/drivers/redis_session'

import { MockHash } from './mock_drivers/hash_mock';
import { MockPSQL } from "./mock_drivers/psql_mock";
import { MockRedisSession } from './mock_drivers/redis_session_mock';

import { IDB_Manager } from '../src/ports/db_manager_port';
import { ISessionManager } from '../src/ports/session_manager_port';
import { IHashable } from '../src/ports/hash_port';


const random_user = () => {
    return {
        username: 'test_username',
        password: 'test_password'
    }
}


describe('debug test', () => {
    let psql: IDB_Manager
    let redis: ISessionManager
    let hash: IHashable
    let user_controller: UserController
    let user: any

    beforeAll(() => {
        psql = new MockPSQL();
        redis = new MockRedisSession();
        // hash = new MockHash();
        hash = new BcryptDriver()

        user_controller = new UserController(psql, hash, redis);
        user = random_user();
        console.log('Connect to Mock DB')

    })
    afterAll(async () => {
        console.log('Ending Connection to Mock DB')
        await psql.end()
    })
    

    test('Create User', async () => {
        expect.assertions(2);
        const created_user = await user_controller.create_new_user(user)
        expect(created_user.username).toBe(user.username)
        expect(created_user.id).toBeDefined()
        user.id = created_user.id
    })

    test('Create User with repeated username', async () => {
        expect.assertions(1)
        const res = await user_controller.create_new_user(user)
        expect(res).toBeFalsy()
    })

    test('Retrieve User by ID', async () => {
        expect.assertions(2)
        const res = await user_controller.retrieve_user({id: user.id})
        expect(res.id).toEqual(user.id)
        expect(res.username).toEqual(user.username)
    })

    test('Retrieve User by Username', async () => {
        expect.assertions(2)
        const res = await user_controller.retrieve_user({username: user.username})
        expect(res.id).toEqual(user.id)
        expect(res.username).toEqual(user.username)
    })

    test('Retrieve User without enough params', async () => {
        expect.assertions(1)
        const res = await user_controller.retrieve_user({})
        expect(res).toBeFalsy()
    })

    test('List All Users', async () => {
        expect.assertions(2)
        const res = await user_controller.list_users({limit:10, offset:0})
        expect(res.count).toBe(1)
        expect(res.users).toEqual(expect.arrayContaining([{username: user.username, id:user.id}]))
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
        expect(fail).toBeFalsy()
    })

    test('Authenticate User with Wrong Username', async () => {
        expect.assertions(1)
        const fail = await user_controller.authenticate_user({username: user.username+'_wrong', password: user.password})
        expect(fail).toBeFalsy()
    })

    test('Delete User', async () => {
        expect.assertions(2)
        const res = await user_controller.delete_user(user.id);
        expect(res).toBe(1)

        // determine if user was deleted after all
        const check = await user_controller.retrieve_user({id:user.id})
        expect(check).toBeFalsy()
    })
})
