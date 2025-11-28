import { Router } from "express";

export const router = Router();

const modulesRoute = [];

modulesRoute.forEach((route) => {
  router.use(route.path, route.route);
});
