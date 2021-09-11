import { Router } from "express";
import { 
    list_users_express, 
    create_new_user_express, 
    retrieve_user_express 
} from "./adapters/users_express_adapter";

const router = Router();


router.get('/users/', list_users_express);
router.get('/users/:id/', retrieve_user_express);

router.post('/users/', create_new_user_express);

export { router };
