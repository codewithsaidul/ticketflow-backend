import { Router } from "express";
import { AuthRoutes } from "../modules/auth/auth.route";
import { UserRoutes } from "../modules/user/user.route";
import { EventsRoutes } from "../modules/events/events.route";
import { SeatRoutes } from "../modules/seat/seat.route";


export const router = Router();

const modulesRoute = [
  {
    path: "/auth",
    route: AuthRoutes
  },
  {
    path: "/users",
    route: UserRoutes
  },
  {
    path: "/events",
    route: EventsRoutes
  },
  {
    path: "/seat",
    route: SeatRoutes
  },
];

modulesRoute.forEach((route) => {
  router.use(route.path, route.route);
});
