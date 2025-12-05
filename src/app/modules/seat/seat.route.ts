import { Router } from "express";
import { SeatController } from "./seat.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { UserRole } from "../user/user.interface";

const router = Router();

router.get("/:eventId", SeatController.getSeatsByEventId);
router.post(
  "/sync", 
  checkAuth(UserRole.USER, UserRole.ADMIN, UserRole.HOST), 
  SeatController.syncSeatLocks
);

export const SeatRoutes = router;
