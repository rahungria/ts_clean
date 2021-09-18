import { PGDriver } from "../drivers/pg";
import { BcryptDriver } from "../drivers/bcrypt"
import { UserController } from "../controller/user_controller";
import { RedisSessionManager } from "../drivers/redis_session"


const pg_driver = new PGDriver({});
const bcrypt_driver = new BcryptDriver();
const redis_session = new RedisSessionManager();

const user_controller = new UserController(pg_driver, bcrypt_driver, redis_session);

export { user_controller }
