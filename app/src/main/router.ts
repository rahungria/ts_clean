import { NextFunction, Request, Response, Router } from "express";
import { ExpressUsersController } from "./adapters/users_express_adapter";
import { Core } from "./core";

export class ExpressRouter {

    private core: Core 
    public router: Router
    public constructor(core: Core) {
        this.core = core
        this.router = Router()

        const users_controller = new ExpressUsersController(this.core.user_controller, this.core.logger);
    
        this.core.logger.info('Registering Express routes')
        this.router.get('/users/', users_controller.list_users_express.bind(users_controller));
        this.router.get('/users/:id/', users_controller.retrieve_user_express.bind(users_controller));

        this.router.post('/users/', users_controller.create_new_user_express.bind(users_controller));
        this.router.post('/users/login/', users_controller.authenticate_user_express.bind(users_controller));
        
        this.router.delete('/users/:id/', users_controller.delete_user_express.bind(users_controller));

        this.router.use(this.log_http.bind(this))
    }

    public async log_http(req: Request, res: Response, next: NextFunction) {
            const {json, status, user} = res.locals
            if (!(json && status)) {
                this.core.logger.warn("couldn't find needed data in 'res.locals', could be invalid route or improper route configuring")
                return next()
                // return res.status(500).json({error: 'Improperly configured routes'})
            }

            // reponse size not completely accurate (assumes 2bytes per char of pre ES6, no UTF-16 chars, no Cyclic references, etc...)
            this.core.http_logger.info(
                `${req.ip} ${user?.username || '-'} "${req.method} ${req.originalUrl} ${req.protocol.toUpperCase()}/${req.httpVersionMajor}.${req.httpVersionMinor}" ${status} ${JSON.stringify(json).length*16}`
            )
            return res.status(status).json(json)
    }
}
