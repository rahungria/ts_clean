import path from 'path';
import fs from 'fs';
import log4js from 'log4js';
import { ILogger } from "../ports/logger_port";


export class DefaultLogger implements ILogger {

    private logger: log4js.Logger;

    public constructor(
        {
            mirror_stdout,
            log_root,
            log_identifier,
            log_level
        }: 
        {
            mirror_stdout: boolean,
            log_root: string,
            log_identifier: string,
            log_level: 'debug'|'info'|'warn'|'error'|'fatal'
        }) 
    {
        // log4js.configure()
        const LOG_ROOT = path.resolve(log_root)
        try {
            fs.accessSync(LOG_ROOT)
        } catch (error: any) {
            console.error(`Couldn't access LOGS root folder: '${LOG_ROOT}'`)
            try {
                fs.mkdirSync(LOG_ROOT)
            } catch (error: any) {
                console.error(`Failed creating LOGS root folder: '${LOG_ROOT}'`)
                throw error
            }
        }
        let _appenders = ['app_log']
        if (mirror_stdout)
            _appenders.push('stdout')
        log4js.configure({
            appenders: {
                app_log: { 
                    type: 'multiFile', base: LOG_ROOT, property: 'identifier',  extension:'.log',
                    // log files max size 10MB, auto compressed and backedup
                    maxLogSize: 10 * 1024*1024, backups: 3, compress: true
                },
                stdout : { type: 'stdout' }
            },
            categories: {
                default: {
                    appenders: _appenders,
                    level: log_level
                }
            }
        })
        this.logger = log4js.getLogger()
        this.logger.addContext('identifier', log_identifier)
    }

    public debug(msg: string) {
        this.logger.debug(msg)
    }
    public info(msg: string) {
        this.logger.info(msg)
    }
    public warn(msg: string) {
        this.logger.warn(msg)
    }
    public error(msg: string) {
        this.logger.error(msg)
    }
    public fatal(msg: string) {
        this.logger.fatal(msg)
    }
}