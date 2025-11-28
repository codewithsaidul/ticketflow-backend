// auth.route.ts
import { Router } from "express";
import { AuthController } from "./auth.controller";

const router = Router();
router.post("/", AuthController.create);
router.get("/", AuthController.index);

export const AuthRoutes =  router;
