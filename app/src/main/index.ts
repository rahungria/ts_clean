import express from "express";

import { router } from "./router";


const app = express();

const PORT = process.env.PORT || 8001;

app.use(express.json());
app.use(router);

app.listen(PORT, () => console.log(`Running on port ${PORT}`));
