import { NextFunction, Request, Response } from "express";
import { UserController } from "../../controller/user_controller";


export class ExpressUsersController {

    private user_controller: UserController
    
    public constructor(user_controller: UserController) {
        this.user_controller = user_controller
    }

    async list_users_express (req: Request, res: Response, next: NextFunction) {
        try {
            let limit = +(req.query.limit as string) || 10;
            let offset = +(req.query.offset as string) || 0;

            const { users, count, next_page, prev_page } = await this.user_controller.list_users({limit, offset});

            let _next_page = (next_page) ? `${process.env.HOST}/users/?limit=${next_page.limit}&offset=${next_page.offset}` : null;
            let _prev_page = (prev_page) ? `${process.env.HOST}/users/?limit=${prev_page.limit}&offset=${prev_page.offset}` : null;
            return res.status(200).json({
                count: users.length,
                next: _next_page,
                prev: _prev_page,
                results: users,
            });
        }
        catch (error: any) {
            console.log(error);
            return res.status(500).json({error});
        }
    }

    async create_new_user_express (req: Request, res: Response, next: NextFunction) {
        try {
            const { username, password } = req.body 
            if (!(username && password))
                return res.status(400).json({error: 'bad request'})
            const user = await this.user_controller.create_new_user({username, password});
            return res.status(201).json({results: user})
        }
        catch (error: any) {
            console.log(error)
            return res.status(500).json({error: error.toString()})
        }
    }

    async retrieve_user_express (req: Request, res: Response, next: NextFunction) {
        try {
            const id: number = +req.params.id;
            if (!id) return res.status(400).json({error: 'bad request'});

            const user = await this.user_controller.retrieve_user({id});
            if (!user)
                return res.status(404).json({error: 'user not found'});

            return res.status(200).json({results: user});
        }
        catch (error: any) {
            console.log(error)
            return res.status(500).json({error: error.toString()})
        }
    }

    async authenticate_user_express (req: Request, res: Response, next: NextFunction) {
        try{
            const { username, password } = req.body;
            if (!(username!=null && password!=null))
                return res.status(400).json({error: 'bad request'});
    
            const user = await this.user_controller.authenticate_user({username, password});
            if (!user)
                return res.status(400).json({error: 'username or password wrong'});
    
            return res.status(200).json({results: user});
        }
        catch (error: any) {
            console.log(error);
            return res.status(500).json({error});
        }
    }

    async delete_user_express (req: Request, res: Response, next: NextFunction) {
        try {
            const id = +req.params.id as number;
            if (!id)
                return res.status(500).json({error: 'bad request'});

            const deleted = await this.user_controller.delete_user(id);
            return res.status(200).json({deleted});
        }
        catch (error: any) {
            console.log(error);
            return res.status(500).json({error})
        }
    }
}