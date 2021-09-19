import { PGDriver } from "../drivers/pg";
import { BcryptDriver } from "../drivers/bcrypt"
import { UserController } from "../controller/user_controller";
import { RedisSessionManager } from "../drivers/redis_session"
import { DefaultLogger } from '../drivers/logger'
import { Command, Option } from 'commander';
import { MigrationManager } from "./migrate";
import { IDB_Manager } from "../ports/db_manager_port";
import { ILogger } from "../ports/logger_port";
import { ISessionManager } from "../ports/session_manager_port";
import { IHashable } from "../ports/hash_port";


export class Core {

    private static instance: Core

    private db: IDB_Manager
    public logger: ILogger
    private session: ISessionManager
    private hasher: IHashable
    private mig_manager: MigrationManager

    public user_controller: UserController
    
    private constructor(
        db: IDB_Manager,
        logger: ILogger,
        session: ISessionManager,
        hasher: IHashable,
        mig_manager: MigrationManager
    ) {
        this.db = db
        this.logger = logger
        this.session = session
        this.hasher = hasher
        this.mig_manager = mig_manager

        this.user_controller = new UserController(this.db, this.hasher, this.session, this.logger)
    }

    private static async create(): Promise<Core> {
        const program = new Command()
        program.version('0.3')
        program
            .addOption(
                new Option('-m, --migrations <migrations>', 'folder where migrations are stored')
                .makeOptionMandatory(true)
            )
            .addOption(
                new Option('-l --log <log>', 'root folder to store logs')
                .makeOptionMandatory(true))
            .addOption(
                new Option('--log-level <logLevel>', 'log level')
                .choices(['debug', 'info', 'warn', 'error', 'fatal'])
                .default('info', 'normal INFO level for production'))
        program.parse(process.argv)
        const options = program.opts()

        const default_logger = new DefaultLogger({
            mirror_stdout: true, 
            log_root: options.log,
            log_identifier: 'app',
            log_level: options.logLevel
        })
        default_logger.info('Initializing APP...')


        default_logger.debug('Creating Drivers...')
        const pg_driver = new PGDriver({}, default_logger);
        const bcrypt_driver = new BcryptDriver(default_logger);
        const redis_session = new RedisSessionManager(default_logger);
        default_logger.debug('Drivers created successfully')

        default_logger.debug('Managing Migrations...')
        const mig_manager = new MigrationManager(default_logger, pg_driver, options.migrations)
        await mig_manager.handle('validate')
        default_logger.debug('Migrations Validated')

        default_logger.info('APP Initialized')
        return new Core(pg_driver, default_logger, redis_session, bcrypt_driver, mig_manager);
    }

    public static async get(): Promise<Core> {
        if (!this.instance) {
            this.instance = await this.create()
        }
        return this.instance
    }
}


// const program = new Command()
// program.version('0.2')
// program
//     .addOption(
//         new Option('-m, --migrations <migrations>', 'folder where migrations are stored')
//         .makeOptionMandatory(true)
//     )
//     .addOption(
//         new Option('-l --log <log>', 'root folder to store logs')
//         .makeOptionMandatory(true))
//     .addOption(
//         new Option('--log-level <logLevel>', 'log level')
//         .choices(['debug', 'info', 'warn', 'error', 'fatal'])
//         .default('info', 'normal INFO level for production'))
// program.parse(process.argv)
// const options = program.opts()

// const default_logger = new DefaultLogger({
//     mirror_stdout: true, 
//     log_root: options.log,
//     log_identifier: 'app',
//     log_level: options.logLevel
// })


// const pg_driver = new PGDriver({}, default_logger);
// const bcrypt_driver = new BcryptDriver(default_logger);
// const redis_session = new RedisSessionManager(default_logger);

// const mig_manager = new MigrationManager(default_logger, pg_driver, options.migrations)
// await mig_manager.handle('validate')

// const user_controller = new UserController(pg_driver, bcrypt_driver, redis_session, default_logger);

// export { user_controller, default_logger }
