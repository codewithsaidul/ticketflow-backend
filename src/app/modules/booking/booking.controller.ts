/* eslint-disable @typescript-eslint/no-unused-vars */

import { JwtPayload } from "jsonwebtoken";
import { TNext, TRequest, TResponse } from "../../types/global";
import { catchAsync } from "../../utils/catchAsync";
import { BookingService } from "./booking.service";
import { sendResponse } from "../../utils/sendResponse";
import { StatusCodes } from "http-status-codes";

export const BookingController = {
  createBooking: catchAsync(
    async (req: TRequest, res: TResponse, next: TNext) => {
      const { userId } = req.user as JwtPayload;
      const payload = {
        ...req.body,
        userId,
      };

      const result = await BookingService.createBooking(payload);

      sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Your Booking created successfullt! Please make payment",
        data: result,
      });
    }
  ),

  getAllBookings: catchAsync(
    async (req: TRequest, res: TResponse, next: TNext) => {
      const result = await BookingService.getAllBookings(req.query as Record<string, string>);

      sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "All bookings retrieved successfully",
        data: result.data,
        meta: result.meta,
      });
    }
  ),

  getHostBookings: catchAsync(
    async (req: TRequest, res: TResponse, next: TNext) => {
      const { userId } = req.user as JwtPayload;
      const result = await BookingService.getHostBookings(userId, req.query as Record<string, string>);

      sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Host bookings retrieved successfully",
        data: result.data,
        meta: result.meta,
      });
    }
  ),

  getMyBookings: catchAsync(
    async (req: TRequest, res: TResponse, next: TNext) => {
      const { userId } = req.user as JwtPayload;

      const result = await BookingService.getMyBookings(userId, req.query as Record<string, string>);

      sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "My bookings retrieved successfully",
        data: result.data,
        meta: result.meta,
      });
    }
  ),

  generateTicketDetails: catchAsync(
    async (req: TRequest, res: TResponse, next: TNext) => {
      const { userId } = req.user as JwtPayload;

      const result = await BookingService.generateTicketDetails(req.params.bookingId as string, userId);

      sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Bookings Details retrieved successfully",
        data: result
      });
    }
  ),
};
