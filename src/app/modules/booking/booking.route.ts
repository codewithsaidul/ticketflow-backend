
import { Router } from "express";
import { BookingController } from "./booking.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { UserRole } from "../user/user.interface";

const router = Router();


router.post(
  "/",
  checkAuth(UserRole.USER, UserRole.SUPERADMIN),
  BookingController.createBooking
);

export const BookingRoutes = router;
