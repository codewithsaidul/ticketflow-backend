
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


router.get(
  "/",
  checkAuth(UserRole.SUPERADMIN, UserRole.ADMIN), 
  BookingController.getAllBookings
);

router.get(
  "/host-bookings",
  checkAuth(UserRole.HOST),
  BookingController.getHostBookings
);


router.get(
  "/my-bookings",
  checkAuth(UserRole.USER),
  BookingController.getMyBookings
);


router.get(
  "/details/:bookingId",
  checkAuth(UserRole.USER),
  BookingController.generateTicketDetails
);

export const BookingRoutes = router;
