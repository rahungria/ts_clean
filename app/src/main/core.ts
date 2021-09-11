import { PGDriver } from "../drivers/pg";
import { BcryptDriver } from "../drivers/bcrypt"
import { UserController } from "../controller/user_controller";

const pg_driver = new PGDriver();
const bcrypt_driver = new BcryptDriver();

const user_controller = new UserController(pg_driver, bcrypt_driver);

export { pg_driver, bcrypt_driver, user_controller }
