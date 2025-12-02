/* eslint-disable @typescript-eslint/no-unused-vars */

import { StatusCodes } from "http-status-codes";
import { TNext, TRequest, TResponse } from "../../types/global";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { SeatService } from "./seat.service";

export const SeatController = {
  getSeatsByEventId: catchAsync(
    async (req: TRequest, res: TResponse, next: TNext) => {
      const { eventId } = req.params;
      const result = await SeatService.getSeatsByEventId(eventId);

      sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Seats retrived successfully!",
        data: result.data,
        meta: result.meta,
      });
    }
  ),
};
