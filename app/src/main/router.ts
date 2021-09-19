import { Router } from "express";
import { ExpressUsersController } from "./adapters/users_express_adapter";
import { Core } from "./core";

export class ExpressRouter {

    private core: Core
    public router: Router
    public constructor(core: Core) {
        this.core = core
        this.router = Router()

        const users_controller = new ExpressUsersController(this.core.user_controller);
    
        this.core.logger.info('Registering Express routes')
        this.router.get('/users/', users_controller.list_users_express);
        this.router.get('/users/:id/', users_controller.retrieve_user_express);

        this.router.post('/users/', users_controller.create_new_user_express);
        this.router.post('/users/login/', users_controller.authenticate_user_express);
        
        this.router.delete('/users/:id/', users_controller.delete_user_express);
    }
}
