import { Request, Response } from "express";
import { AuthService } from "./auth.service";

export const AuthController = {
  async create(req: Request, res: Response) {
    const data = await AuthService.create(req.body);
    res.json(data);
  },
  async index(req: Request, res: Response) {
    const list = await AuthService.findAll();
    res.json(list);
  },
};
