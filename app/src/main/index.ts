import express from "express";
import { Core } from "./core";

import { ExpressRouter } from "./router";

Core.get().then(core => {
    const router = new ExpressRouter(core)
    const app = express();

    const PORT = process.env.PORT || 8001;

    app.use(express.json());
    app.use(router.router);

    app.listen(PORT, () => console.log(`Running on port ${PORT}`));
},
error => {
    console.log('Failed to Init core')
    console.log(error)
    throw error
})
