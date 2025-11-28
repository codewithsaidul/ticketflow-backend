// user.controller.ts
import { Request, Response } from "express";
import { UserService } from "./user.service";

export const UserController = {
  async create(req: Request, res: Response) {
    const data = await UserService.create(req.body);
    res.json(data);
  },
  async index(req: Request, res: Response) {
    const list = await UserService.findAll();
    res.json(list);
  },
};
