import fs from 'fs';
import * as path from 'path';
import { exit } from "process";
import { Command, Option } from 'commander'

import { DefaultLogger } from '../drivers/logger'
import { PGDriver } from '../drivers/pg'

import { IDB_Manager } from '../ports/db_manager_port'
import { ILogger } from '../ports/logger_port';


export type Migration = {
    id: number,
    filename: string,
    exec_order: number,
    executed: boolean,
}

type MigrationFile = {
    file: string,
    absolute: string,
    order: number
}


class MigrationError extends Error {
    public migration: Migration;
    public file: string;

    constructor(message: string, migration: Migration, file: string) {
        super(message);
        this.migration = migration;
        this.file = file;
    }
}


class MigrationsManager {
    private logger: ILogger
    private db: IDB_Manager
    private mig_folder: string
    private mig_files: MigrationFile[]

    constructor(logger: ILogger, db: IDB_Manager, mig_folder: string) {
        this.logger = logger
        this.db = db
        this.mig_folder = mig_folder

        try {
            this.mig_files = fs.readdirSync(mig_folder).map(file => {
                let p = path.join(mig_folder, file)
                p = fs.realpathSync(p)
                return {
                    absolute: p,
                    file: file,
                    order: +file.substr(0, 3)
                }
            })
        } catch (error: any) {
            this.logger.fatal('Invalid path to Migrations or Log')
            exit(1)
        }
    }

    private async init () {
        const connection = await this.db.get_connection()
        try {
            await connection.query(`SELECT 'migration'::regclass`)
        } catch (error: any) {
            await connection.query(
                `CREATE TABLE IF NOT EXISTS migration (
                    id SERIAL,
                    filename VARCHAR(255) NOT NULL,
                    exec_order INTEGER NOT NULL,
                    executed BOOLEAN DEFAULT FALSE,
    
                    UNIQUE(filename),
                    UNIQUE(exec_order)
                );`
            )
        } finally {
            this.db.close_connection(connection);
        }
    }

    private async validate () {
        this.logger.info("VALIDATING MIGRATIONS...")
        const con = await this.db.get_connection()
        try {
            const migs = (await con.query('SELECT * FROM migration;')).rows as Migration[]
            let err = false
            for (const file of this.mig_files) {
                const mig = migs.find(m => m.filename == file.file)
                if (!mig) {
                    this.logger.warn(`Found Unregistered Migration '${file.file}'`)
                    err = true
                }
                if (mig && file.order != mig.exec_order) {
                    this.logger.error(
                        `Local migration order doesn't match Registered Migrations!\nLOCAL:\t\tfile:${file.file}, order:${file.order}\nREGISTERED:\tfile:${mig.filename}, order:${mig.exec_order}, id:${mig.id}`
                    )
                    err = true
                }
            }
            for (const mig of migs) {
                const file = this.mig_files.find(f => f.file == mig.filename)
                if (!file) {
                    this.logger.error(`Registered Migrations not found locally: ${mig.filename}`)
                    err = true
                }
            }
            if (err) {
                this.logger.error('Invalid State Found, Terminating...')
                throw new Error('Invalid State Found, Terminating...')
            } else {
                this.logger.info('No issues found.')
            }
        } finally {
            this.db.close_connection(con)
        }
    }

    private async unregister () {
        this.logger.info("UNREGISTERING ALL MIGRATIONS...")
        const con = await this.db.get_connection()
        try {
            await con.query('DELETE FROM migration;')
            this.logger.info("Migrations unregistered.")
        } finally {
            this.db.close_connection(con);
        }
    }

    
    private async register () {
        this.logger.info('REGISTERING MIGRATIONS...')
        const connection = await this.db.get_connection()
        try {
            let unregistered_files: MigrationFile[] = [];
            for (const file of this.mig_files) {
                const { rowCount } = await connection.query(
                    'SELECT * FROM migration WHERE filename=$1;',
                    [file.file]
                    )
                    if (rowCount == 0) {
                        unregistered_files.push(file)
                    }
                }
                this.logger.info(`Found ${unregistered_files.length} Unregistered Migrations...`)
                let _files  = [];
                await connection.query('BEGIN')
                for (const file of unregistered_files){
                    this.logger.info(`Registering Migration of: ${file.absolute}`)
                    let r = await connection.query('SELECT * from migration WHERE exec_order=$1', [file.order])
                    if (r.rowCount > 0) {
                        this.logger.error("Local Migration Order doesn't match Database!")
                        this.logger.debug(r.rows[0])
                        await connection.query('ROLLBACK')
                        exit(1);
                    }
                    const {rows} = await connection.query(
                        'INSERT INTO migration(filename, exec_order) VALUES ($1, $2) RETURNING *;',
                        [file.file, file.order]
                        )
                        _files.push(rows);
                        this.logger.debug(`inserting migration: file:${file.file}, order:${file.order}`)
                    }
                    await connection.query('COMMIT')
                    this.logger.info('Migrations registered.')
        }
        finally {
            this.db.close_connection(connection)
        }       
    }
            
    private async execute () {
        this.logger.info("EXECUTING MIGRATIONS")
        const con = await this.db.get_connection()
        try {
            const migrations = (await con.query(
                `SELECT * FROM migration 
                WHERE executed is FALSE
                ORDER BY exec_order ASC;`
            )).rows as Migration[]
            this.logger.info(`Found ${migrations.length} unexecuted Migrations...`)
            try{
                await con.query('BEGIN;')
                for (const migration of migrations) {
                    const f = path.join(this.mig_folder, migration.filename)
                    // remove all pesky symbols no database would accept as SAVEPOINT name
                    const savepoint = migration.filename.replace(/[0-9\!\@\#\$\%\"\&\*\(\)\-\_\=\+\,\<\.\>\;\:/\?\\\/]/g, '')
                    try {
                        await con.query(`SAVEPOINT ${savepoint};`)
                        this.logger.info(`Executing Migration of: ${f}`)
                        const query = fs.readFileSync(f).toString()
                        await con.query(query)
                        await con.query(
                            `UPDATE migration 
                            SET EXECUTED=TRUE
                            WHERE id=$1`,
                            [migration.id]
                        )
                        await con.query(`RELEASE SAVEPOINT ${savepoint};`)
                    } catch (error: any) {
                        const err = new MigrationError(error.message, migration, f);
                        throw err
                    }
                }
                await con.query('COMMIT')
                this.logger.info('Migrations executed.') 
            } catch (error: any) {
                this.logger.error(error)
                con.query('ROLLBACK')
                this.logger.error(`Failed executing query for migration#${error.migration.id}: ${error.file}\nRolling Back all changes...`)
            } 
        } finally {
            await this.db.close_connection(con)
        }
    }

    public async handle(
        action: 'validate'|'unregister'|'register'|'execute') {
        try {
            this.logger.info(`Handling action: '${action}'`)
            await this.init()
            if (action == 'validate') {
                await this.validate()
            }
            else if (action == 'unregister') {
                await this.unregister()
            } 
            else if (action == 'register') {
                await this.register()
            }
            else if (action == 'execute') {
                await this.validate()
                await this.execute()
            }
            else {
                this.logger.error(`Invalid action '${action}'`)
            }
        } finally {
            this.db.end()
            exit(0)
        }
    }
}




;(async ()=>{
    const program = new Command()
    program.version('0.1')
    program
        .addOption(
            new Option('-H, --host <host>', 'optional DB host to run migrations against')
            .env('DB_HOST')
        )
        .addOption(
            new Option('-m, --migrations <folder>', 'local folder where migrations are stored')
            .makeOptionMandatory()
        )
        .addOption(
            new Option('-a, --action <command>', 'action to be executed')
            .makeOptionMandatory()
            .choices(['register', 'unregister', 'execute', 'validate'])
        )
        .addOption(
            new Option('-l --log <log>', 'log root')
        )
        .addOption(
            new Option('-ll, --log-level <loglevel>', 'level of log')
            .choices(['debug', 'info', 'warn', 'error', 'fatal'])
            .default('debug', 'DEBUG level logging')
        )

    program.parse(process.argv)
    const args = program.opts()
    
    let migration_files: MigrationFile[]

    const logger = new DefaultLogger({
        mirror_stdout: true,
        log_root: args.log,
        log_identifier: 'migrations',
        log_level: args.logLevel
    })

    const db = new PGDriver({host: args.host}, logger)

    const mig_manager = new MigrationsManager(logger, db, args.migrations)

    mig_manager.handle(args.action)

})();