// events.route.ts
import { Router } from "express";
import { EventsController } from "./events.controller";

const router = Router();
router.post("/", EventsController.create);
router.get("/", EventsController.index);

export const EventsRoutes = router;
