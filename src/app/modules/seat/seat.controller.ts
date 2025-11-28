// seat.controller.ts
import { Request, Response } from "express";
import { SeatService } from "./seat.service";

export const SeatController = {
  async create(req: Request, res: Response) {
    const data = await SeatService.create(req.body);
    res.json(data);
  },
  async index(req: Request, res: Response) {
    const list = await SeatService.findAll();
    res.json(list);
  },
};
