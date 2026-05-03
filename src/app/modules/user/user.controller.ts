/* eslint-disable @typescript-eslint/no-unused-vars */
import { StatusCodes } from "http-status-codes";
import { TNext, TRequest, TResponse } from "../../types/global";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { UserService } from "./user.service";
import { JwtPayload } from "jsonwebtoken";

export const UserController = {
  getAllUsers: catchAsync(
    async (req: TRequest, res: TResponse, next: TNext) => {
      const query = req.query;
      const users = await UserService.getAllUsers(
        query as Record<string, string>
      );

      sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Users retrieved successfully",
        data: users.data,
        meta: users.meta,
      });
    }
  ),

  getUserProfile: catchAsync(
    async (req: TRequest, res: TResponse, next: TNext) => {
      const decodedToken = req.user as JwtPayload;

      const user = await UserService.getUserProfile(decodedToken.userId);

      sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "User profile retrieved successfully",
        data: user,
      });
    }
  ),

  updateUserStatus: catchAsync(
    async (req: TRequest, res: TResponse, next: TNext) => {
      const payload = req.body;
      const { userId, role} = req.user as JwtPayload
      const user = await UserService.updateUserStatus(
        req.params.userId as string,
        payload.status,
        userId,
        role
      );

      sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "User status updated successfully",
        data: user,
      });
    }
  ),

  updateUserInfo: catchAsync(
    async (req: TRequest, res: TResponse, next: TNext) => {
      const { userId } = req.params;
      const payload = req.body;
      const decodedToken = req.user as JwtPayload;

      const updatedUser = await UserService.updateUserInfo(
        userId as string,
        payload,
        decodedToken.role
      );

      sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "User has been updated successfully",
        data: updatedUser,
      });
    }
  ),

  deleteUser: catchAsync(async (req: TRequest, res: TResponse, next: TNext) => {
    const { userId } = req.params;
    const decodedToken = req.user as JwtPayload;
    await UserService.deleteUser(userId as string, decodedToken.role);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "User has been deleted successfully",
      data: null,
    });
  }),
};
