/* eslint-disable @typescript-eslint/no-unused-vars */
import { StatusCodes } from "http-status-codes";
import { TNext, TRequest, TResponse } from "../../types/global";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AdminService } from "./admin.service";
import { IUser } from "../user/user.interface";

export const AdminController = {
  createAdmin: catchAsync(
    async (req: TRequest, res: TResponse, next: TNext) => {
      const payload: IUser = {
        ...req.body,
        profileImg: req?.file?.path,
      };
      const result = await AdminService.createAdmin(payload);

      sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Admin created successfully!",
        data: result,
      });
    }
  ),
  getAllAdmins: catchAsync(
    async (req: TRequest, res: TResponse, next: TNext) => {
      const result = await AdminService.getAllAdmins(
        req.query as Record<string, string>
      );

      sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "All Admins retrived successfully!",
        data: result.data,
        meta: result.meta,
      });
    }
  ),
};
