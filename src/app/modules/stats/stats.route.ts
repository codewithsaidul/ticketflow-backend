import { Router } from "express";
import { StatsController } from "./stats.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { UserRole } from "../user/user.interface";

const router = Router();


router.get(
  "/",
  checkAuth(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.HOST),
  StatsController.getStats
);

export const StatsRoutes = router;
