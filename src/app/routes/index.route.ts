import { Router } from "express";
import { AuthRoutes } from "../modules/auth/auth.route";
import { UserRoutes } from "../modules/user/user.route";
import { EventsRoutes } from "../modules/events/events.route";
import { SeatRoutes } from "../modules/seat/seat.route";
import { BookingRoutes } from "../modules/booking/booking.route";
import { PaymentRoutes } from "../modules/payment/payment.route";

export const router = Router();

const modulesRoute = [
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/users",
    route: UserRoutes,
  },
  {
    path: "/events",
    route: EventsRoutes,
  },
  {
    path: "/seats",
    route: SeatRoutes,
  },
  {
    path: "/bookings",
    route: BookingRoutes,
  },
  {
    path: "/payment",
    route: PaymentRoutes,
  },
];

modulesRoute.forEach((route) => {
  router.use(route.path, route.route);
});
