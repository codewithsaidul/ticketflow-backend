// stats.controller.ts
import { Request, Response } from "express";
import { StatsService } from "./stats.service";

export const StatsController = {
  async create(req: Request, res: Response) {
    const data = await StatsService.create(req.body);
    res.json(data);
  },
  async index(req: Request, res: Response) {
    const list = await StatsService.findAll();
    res.json(list);
  },
};
