import { Router } from "express";
import { ExpressUsersController } from "./adapters/users_express_adapter";

const router = Router();
const users_controller = new ExpressUsersController();

router.get('/users/', users_controller.list_users_express);
router.get('/users/:id/', users_controller.retrieve_user_express);

router.post('/users/', users_controller.create_new_user_express);
router.post('/users/login/', users_controller.authenticate_user_express);

router.delete('/users/:id/', users_controller.delete_user_express);

export { router };
