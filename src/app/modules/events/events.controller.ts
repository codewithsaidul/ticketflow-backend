// events.controller.ts
import { Request, Response } from "express";
import { EventsService } from "./events.service";

export const EventsController = {
  async create(req: Request, res: Response) {
    const data = await EventsService.create(req.body);
    res.json(data);
  },
  async index(req: Request, res: Response) {
    const list = await EventsService.findAll();
    res.json(list);
  },
};
