import { exit } from "process";
import * as path from 'path';
import fs from 'fs';
import { Command, Option } from 'commander'

import { PGDriver } from '../drivers/pg'


export type Migration = {
    id: number,
    filename: string,
    exec_order: number,
    executed: boolean,
}

type file = {
    file: string,
    absolute: string 
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


const init = async (pg: PGDriver) => {
    const connection = await pg.get_connection()
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
        pg.close_connection(connection);
    }
}


const register_case = async (pg: PGDriver, files: file[]) => {
    const connection = await pg.get_connection()
    try {
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
        }
        let unregistered_files: file[] = [];
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
            const order = +file.file.substr(0,3)
            let r = await connection.query('SELECT * from migration WHERE exec_order=$1', [order])
            if (r.rowCount > 0) {
                console.log("Local Migration Order doesn't match Database!")
                console.log(r.rows[0])
                await connection.query('ROLLBACK')
                exit(1);
            }
            const {rows} = await connection.query(
                'INSERT INTO migration(filename, exec_order) VALUES ($1, $2) RETURNING *;',
                [file.file, order]
            )
            _files.push(rows);
        }
        await connection.query('COMMIT')
    }
    finally {
        pg.close_connection(connection)
    }
    
}

const execute_case = async (pg: PGDriver, files: file[], folder: string) => {
    const con = await pg.get_connection()
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
                const savepoint = migration.filename.split('.')[0].substr(4)
                try {
                    await con.query(`SAVEPOINT ${savepoint};`)
                    console.log(`Executing Migration of: ${f}`)
                    const query = fs.readFileSync(f).toString()
                    const r = await con.query(query)
                    const _ = await con.query(
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
        } catch (error: any) {
            console.log(error)
            con.query('ROLLBACK')
            console.log(`Failed executing query for migration#${error.migration.id}: ${error.file}\nRolling Back all changes...`)
        }
                
    } finally {
        await pg.close_connection(con)
    }
}

const unregister_case = async (pg: PGDriver, all: boolean) => {
    const con = await pg.get_connection()
    try {
        await con.query('DELETE FROM migration;')
    } finally {
        pg.close_connection(con);
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
            .choices(['register', 'unregister', 'execute'])
        )
        .addOption(
            new Option('-v --verbose <level>', 'verbosity level')
            .choices(['0', '1', '2'])
            .default('0', 'quiet (0)')
        )

    program.parse(process.argv)
    const args = program.opts()
    
    let migration_files: file[]

    try {
        migration_files = fs.readdirSync(args.migrations).map(file => {
            return {
                absolute: path.join(args.migrations, file),
                file: file
            }
        })
    } catch (error: any) {
        console.log('Invalid path to Migrations')
        exit(1)
    }

    const pg = new PGDriver({host: args.host})

    try {
        await init(pg);
        if (args.action == 'register') {
            console.log('REGISTERING LOCAL MIGRATIONS...')
            await register_case(pg, migration_files)
        }
        else if (args.action == 'execute') {
            console.log('EXECUTING LOCAL MIGRATIONS...')
            await execute_case(pg, migration_files, args.migrations)
        }
        else if (args.action == 'unregister') {
            console.log("UNREGISTERING ALL MIGRATIONS...")
            await unregister_case(pg, true)
        }
    } finally {
        pg.end()
    }

})();