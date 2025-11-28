// seat.route.ts
import { Router } from "express";
import { SeatController } from "./seat.controller";

const router = Router();
router.post("/", SeatController.create);
router.get("/", SeatController.index);

export const SeatRoutes = router;
