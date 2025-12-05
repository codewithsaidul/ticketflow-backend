import { JwtPayload } from "jsonwebtoken";
import { TRequest, TResponse } from "../../types/global";
import { catchAsync } from "../../utils/catchAsync";
import { StatsService } from "./stats.service";
import { UserRole } from "../user/user.interface";
import { AppError } from "../../errorHelpers/AppError";
import { StatusCodes } from "http-status-codes";
import { sendResponse } from "../../utils/sendResponse";

export const StatsController = {
  getStats: catchAsync(async (req: TRequest, res: TResponse) => {
    const user = req.user as JwtPayload;

    let result;

    if (user.role === UserRole.SUPERADMIN || user.role === UserRole.ADMIN) {
      result = await StatsService.getPlatformStats();
    } else if (user.role === UserRole.HOST) {
      result = await StatsService.getHostStats(user.userId);
    } else {
      throw new AppError(StatusCodes.FORBIDDEN, "Access Denied");
    }

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Dashboard statistics retrieved successfully",
      data: result,
    });
  }),
};
