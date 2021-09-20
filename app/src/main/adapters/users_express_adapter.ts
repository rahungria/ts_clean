import { NextFunction, Request, Response } from "express";
import { UserController } from "../../controller/user_controller";
import { ILogger } from "../../ports/logger_port";


export class ExpressUsersController {

    private user_controller: UserController
    private logger: ILogger
    public constructor(user_controller: UserController, logger: ILogger) {
        this.user_controller = user_controller
        this.logger = logger
    }

    async list_users_express (req: Request, res: Response, next: NextFunction) {
        this.logger.debug('Express listing users')
        try {
            let limit = +(req.query.limit as string) || 10;
            let offset = +(req.query.offset as string) || 0;

            const { users, count, next_page, prev_page } = await this.user_controller.list_users({limit, offset});

            let _next_page = (next_page) ? `${process.env.HOST}/users/?limit=${next_page.limit}&offset=${next_page.offset}` : null;
            let _prev_page = (prev_page) ? `${process.env.HOST}/users/?limit=${prev_page.limit}&offset=${prev_page.offset}` : null;
            res.locals.status = 200
            res.locals.json = {
                count: users.length,
                next: _next_page,
                prev: _prev_page,
                results: users,
            }
            return next()
        }
        catch (error: any) {
            this.logger.error(error);
            res.locals.status = 500
            res.locals.json = {error}
            return next()
        }
    }

    async create_new_user_express (req: Request, res: Response, next: NextFunction) {
        this.logger.debug('Express creating user')
        try {
            const { username, password } = req.body 
            if (!(username!=undefined && password!=undefined)) {
                res.locals.status = 400
                res.locals.json = {error: 'bad request'}
                return next()
            }

            const user = await this.user_controller.create_new_user({username, password});
            if (!user) {
                res.locals.status = 400
                res.locals.json = {error: 'failed creating user'}
                return next()
            }
            res.locals.status = 201
            res.locals.json = {results: user}
            return next()
        }
        catch (error: any) {
            this.logger.error(error)
            res.locals.status = 500
            res.locals.json = {error}
            return next()
        }
    }

    async retrieve_user_express (req: Request, res: Response, next: NextFunction) {
        this.logger.debug('Express retrieving user')
        try {
            const id: number = +req.params.id;
            if (!id){
                res.locals.status = 400
                res.locals.json = {error: 'bad request'}
                return next()
            }

            const user = await this.user_controller.retrieve_user({id});
            if (!user) {
                res.locals.status = 404
                res.locals.json = {error: 'user not found'}
                return next()
            }

            res.locals.status = 200
            res.locals.json = {results: user}
            return next()
        }
        catch (error: any) {
            this.logger.error(error)
            res.locals.status = 500
            res.locals.json = {error}
            return next()
        }
    }

    async authenticate_user_express (req: Request, res: Response, next: NextFunction) {
        this.logger.debug('Express Auth user')
        try{
            const { username, password } = req.body;
            if (!(username!=null && password!=null)) {
                res.locals.status = 400
                res.locals.json = {error: 'bad request'}
                return next()
            }
    
            const user = await this.user_controller.authenticate_user({username, password});
            if (!user) {
                res.locals.status = 400
                res.locals.json = {error: 'username or password wrong'}
                return next()
            }
    
            res.locals.status = 200
            res.locals.user = user
            res.locals.json = {results: user}
            return next()
        }
        catch (error: any) {
            this.logger.error(error);
            res.locals.status = 500
            res.locals.json = {error}
            return next()
        }
    }

    async delete_user_express (req: Request, res: Response, next: NextFunction) {
        this.logger.debug('Express deleting user')
        try {
            const id = +req.params.id as number;
            if (!id) {
                res.locals.status = 400
                res.locals.json = {error: 'bad request'}
                return next()
            }

            const deleted = await this.user_controller.delete_user(id);
            res.locals.status = 200
            res.locals.json = {deleted}
            return next()
        }
        catch (error: any) {
            this.logger.error(error);
            res.locals.status = 500
            res.locals.json = {error}
            return next()
        }
    }
}