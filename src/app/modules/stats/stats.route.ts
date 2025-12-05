// stats.route.ts
import { Router } from "express";
import { StatsController } from "./stats.controller";

const router = Router();
router.post("/", StatsController.create);
router.get("/", StatsController.index);

export default router;
