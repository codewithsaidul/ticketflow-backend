import { Router } from "express";
import { SeatController } from "./seat.controller";

const router = Router();

router.get("/:eventId", SeatController.getSeatsByEventId);

export const SeatRoutes = router;
