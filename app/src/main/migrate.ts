import { exit } from "process";
import * as path from 'path';
import fs from 'fs';
import { Command, Option } from 'commander'

import { PGDriver } from '../drivers/pg'
import { IDB_Manager } from '../ports/db_manager_port'


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


const init = async (db: IDB_Manager) => {
    const connection = await db.get_connection()
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
        db.close_connection(connection);
    }
}

const validate_case = async (db: IDB_Manager, files: MigrationFile[]) => {
    console.log("VALIDATING MIGRATIONS...")
    const con = await db.get_connection()
    try {
        const migs = (await con.query('SELECT * FROM migration;')).rows as Migration[]
        let err = false
        for (const file of files) {
            const mig = migs.find(m => m.filename == file.file)
            if (!mig) {
                console.warn(`Found Unregistered Migration '${file.file}'`)
                err = true
            }
            if (mig && file.order != mig.exec_order) {
                console.error(
                    `Local migration order doesn't match Registered Migrations!\nLOCAL:\t\tfile:${file.file}, order:${file.order}\nREGISTERED:\tfile:${mig.filename}, order:${mig.exec_order}, id:${mig.id}`
                )
                err = true
            }
        }
        for (const mig of migs) {
            const file = files.find(f => f.file == mig.filename)
            if (!file) {
                console.error(`Registered Migrations not found locally: ${mig.filename}`)
                err = true
            }
        }
        if (err) {
            console.error('Errors found, Terminating...')
            exit(1)
        } else {
            console.log('No issues found.')
        }
    } finally {
        db.close_connection(con)
    }
}

const register_case = async (db: IDB_Manager, files: MigrationFile[]) => {
    console.log('REGISTERING MIGRATIONS...')
    const connection = await db.get_connection()
    try {
        let unregistered_files: MigrationFile[] = [];
        for (const file of files) {
            const { rowCount } = await connection.query(
                'SELECT * FROM migration WHERE filename=$1;',
                [file.file]
            )
            if (rowCount == 0) {
                unregistered_files.push(file)
            }
        }
        console.log(`Found ${unregistered_files.length} Unregistered Migrations...`)
        let _files  = [];
        await connection.query('BEGIN')
        for (const file of unregistered_files){
            console.log(`Registering Migration of: ${file.absolute}`)
            let r = await connection.query('SELECT * from migration WHERE exec_order=$1', [file.order])
            if (r.rowCount > 0) {
                console.log("Local Migration Order doesn't match Database!")
                console.log(r.rows[0])
                await connection.query('ROLLBACK')
                exit(1);
            }
            const {rows} = await connection.query(
                'INSERT INTO migration(filename, exec_order) VALUES ($1, $2) RETURNING *;',
                [file.file, file.order]
            )
            _files.push(rows);
        }
        await connection.query('COMMIT')
        console.log('Migrations registered.')
    }
    finally {
        db.close_connection(connection)
    }
    
}

const execute_case = async (db: IDB_Manager, files: MigrationFile[], folder: string) => {
    console.log("EXECUTING MIGRATIONS")
    const con = await db.get_connection()
    try {
        const migrations = (await con.query(
            `SELECT * FROM migration 
            WHERE executed is FALSE
            ORDER BY exec_order ASC;`
        )).rows as Migration[]
        console.log(`Found ${migrations.length} unexecuted Migrations...`)
        try{
            await con.query('BEGIN;')
            for (const migration of migrations) {
                const f = path.join(folder, migration.filename)
                // remove all pesky symbols no database would accept as SAVEPOINT name
                const savepoint = migration.filename.replace(/[0-9\!\@\#\$\%\"\&\*\(\)\-\_\=\+\,\<\.\>\;\:/\?\\\/]/g, '')
                try {
                    await con.query(`SAVEPOINT ${savepoint};`)
                    console.log(`Executing Migration of: ${f}`)
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
            console.log('Migrations executed.') 
        } catch (error: any) {
            console.log(error)
            con.query('ROLLBACK')
            console.log(`Failed executing query for migration#${error.migration.id}: ${error.file}\nRolling Back all changes...`)
        } 
    } finally {
        await db.close_connection(con)
    }
}

const unregister_case = async (db: IDB_Manager) => {
    console.log("UNREGISTERING ALL MIGRATIONS...")
    const con = await db.get_connection()
    try {
        await con.query('DELETE FROM migration;')
        console.log("Migrations unregistered.")
    } finally {
        db.close_connection(con);
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
            new Option('-v --verbose <level>', 'verbosity level')
            .choices(['0', '1', '2'])
            .default('0', 'quiet (0)')
        )

    program.parse(process.argv)
    const args = program.opts()
    
    let migration_files: MigrationFile[]

    try {
        migration_files = fs.readdirSync(args.migrations).map(file => {
            let p = path.join(args.migrations, file)
            p = fs.realpathSync(p)
            return {
                absolute: p,
                file: file,
                order: +file.substr(0, 3)
            }
        })
    } catch (error: any) {
        console.log('Invalid path to Migrations')
        exit(1)
    }

    const db = new PGDriver({host: args.host})

    try {
        await init(db);
        if (args.action == 'validate') {
            await validate_case(db, migration_files)
        }
        if (args.action == 'register') {
            await register_case(db, migration_files)
        }
        else if (args.action == 'unregister') {
            await unregister_case(db)
        }
        else if (args.action == 'execute') {
            await validate_case(db, migration_files)
            await execute_case(db, migration_files, args.migrations)
        }
    } finally {
        db.end()
    }

})();