import { NextFunction, Request, Response } from "express";
import { user_controller } from "../core";


export const list_users_express = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let limit = +(req.query.limit as string) || 10;
        let offset = +(req.query.offset as string) || 0;

        const { users, count, prev, next } = await user_controller.list_users({limit, offset});

        let next_page = (next) ? `${process.env.HOST}/users/?limit=${next.limit}&offset=${next.offset}` : null;
        let prev_page = (prev) ? `${process.env.HOST}/users/?limit=${prev.limit}&offset=${prev.offset}` : null;
        return res.status(200).json({
            count: users.length,
            next: next_page,
            prev: prev_page,
            results: users,
        });
    }
    catch (error: any) {
        console.log(error)
        return res.status(500).json({error: error.toString()})
    }
}

export const create_new_user_express = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { username, password } = req.body 
        const user = await user_controller.create_new_user({username, password});
        return res.status(201).json({results: user})
    }
    catch (error: any) {
        console.log(error)
        return res.status(500).json({error: error.toString()})
    }
}

export const retrieve_user_express = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id: number = +req.params.id;
        if (!id) return res.status(400).json({error: 'bad request'});

        const users = await user_controller.retrieve_user({id});
        if (!users)
            return res.status(400).json({error: 'bad request'});

        return res.status(200).json({results: users});
    }
    catch (error: any) {
        console.log(error)
        return res.status(500).json({error: error.toString()})
    }
}
