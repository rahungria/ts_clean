import { PGDriver } from "../drivers/pg";
import { BcryptDriver } from "../drivers/bcrypt"
import { UserController } from "../controller/user_controller";
import { RedisSessionManager } from "../drivers/redis_session"
import { DefaultLogger } from '../drivers/logger'
import { Command, Option } from 'commander';


const program = new Command()
program.version('0.2')
program
    .addOption(
        new Option('-l --log <log>', 'root folder to store logs')
        .makeOptionMandatory(true))
    .addOption(
        new Option('--log-level <logLevel>', 'log level')
        .choices(['debug', 'info', 'warn', 'error', 'fatal'])
        .default('info', 'normal INFO level for prodcution'))
program.parse(process.argv)
const options = program.opts()

const default_logger = new DefaultLogger({
    mirror_stdout: true, 
    log_root: options.log,
    log_identifier: 'app',
    log_level: options.logLevel
})

const pg_driver = new PGDriver({}, default_logger);
const bcrypt_driver = new BcryptDriver(default_logger);
const redis_session = new RedisSessionManager(default_logger);


const user_controller = new UserController(pg_driver, bcrypt_driver, redis_session, default_logger);

export { user_controller, default_logger }
