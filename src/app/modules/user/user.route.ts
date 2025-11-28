// user.route.ts
import { Router } from "express";
import { UserController } from "./user.controller";

const router = Router();
router.post("/", UserController.create);
router.get("/", UserController.index);

export const UserRoutes =  router;
