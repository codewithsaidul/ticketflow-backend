/* eslint-disable @typescript-eslint/no-unused-vars */

import { JwtPayload } from "jsonwebtoken";
import { TNext, TRequest, TResponse } from "../../types/global";
import { catchAsync } from "../../utils/catchAsync";
import { BookingService } from "./booking.service";
import { sendResponse } from "../../utils/sendResponse";
import { StatusCodes } from "http-status-codes";

export const BookingController = {
  createBooking: catchAsync(async (req: TRequest, res: TResponse, next: TNext) => {
    const { userId } = req.user as JwtPayload;
    const payload = {
      ...req.body,
      userId
    }

    const result = await BookingService.createBooking(payload);


    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Your Booking created successfullt! Please make payment",
      data: result
    })
  })
};
