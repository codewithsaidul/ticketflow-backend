import { Router } from "express";
import { EventsController } from "./events.controller";
import { multerUpload } from "../../config/multer.config";
import { validateRequest } from "../../middleware/validateRequest";
import { createEventZodSchema, updateEventZodSchema } from "./event.validation";
import { checkAuth } from "../../middleware/checkAuth";
import { UserRole } from "../user/user.interface";

const router = Router();
router.post(
  "/",
  checkAuth(UserRole.HOST, UserRole.ADMIN, UserRole.SUPERADMIN),
  multerUpload.single("file"),
  validateRequest(createEventZodSchema),
  EventsController.createEvent
);

router.get("/", EventsController.getAllEvents);
router.get(
  "/my-events",
  checkAuth(UserRole.HOST),
  EventsController.getMyAllEvents
);
router.get(
  "/dashboard/:eventId",
  checkAuth(UserRole.HOST, UserRole.ADMIN, UserRole.SUPERADMIN),
  EventsController.getSingleEvent
);
router.get("/:slug", EventsController.getEventDetails);


router.patch(
  "/:eventId",
  checkAuth(UserRole.HOST, UserRole.ADMIN, UserRole.SUPERADMIN),
  multerUpload.single("file"),
  validateRequest(updateEventZodSchema),
  EventsController.updateEvent
);
router.delete(
  "/:eventId",
  checkAuth(UserRole.HOST, UserRole.ADMIN, UserRole.SUPERADMIN),
  EventsController.deleteEvent
);

export const EventsRoutes = router;
