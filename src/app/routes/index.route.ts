import { Router } from "express";
import { AuthRoutes } from "../modules/auth/auth.route";
import { BookingRoutes } from "../modules/booking/booking.route";
import { EventsRoutes } from "../modules/events/events.route";
import { PaymentRoutes } from "../modules/payment/payment.route";
import { SeatRoutes } from "../modules/seat/seat.route";
import { UserRoutes } from "../modules/user/user.route";
import { StatsRoutes } from "../modules/stats/stats.route";
import { AdminRoutes } from "../modules/admin/admin.route";

export const router = Router();

const modulesRoute = [
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/admins",
    route: AdminRoutes,
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
  {
    path: "/stats",
    route: StatsRoutes
  }
];

modulesRoute.forEach((route) => {
  router.use(route.path, route.route);
});
