/* eslint-disable @typescript-eslint/no-unused-vars */
import { EventsService } from "./events.service";
import { catchAsync } from "../../utils/catchAsync";
import { TNext, TRequest, TResponse } from "../../types/global";
import { sendResponse } from "../../utils/sendResponse";
import { StatusCodes } from "http-status-codes";
import { IEvent } from "./events.interface";
import { JwtPayload } from "jsonwebtoken";

export const EventsController = {
  createEvent: catchAsync(
    async (req: TRequest, res: TResponse, next: TNext) => {
      const payload: IEvent = {
        ...req.body,
        image: req?.file?.path,
      };

      const { userId } = req.user as JwtPayload;

      const event = await EventsService.createEvent(payload, userId);

      sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Event created successfully",
        data: event,
      });
    }
  ),

  getAllEvents: catchAsync(
    async (req: TRequest, res: TResponse, next: TNext) => {
      const events = await EventsService.getAllEvents(
        req.query as Record<string, string>
      );

      sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "All Events retrived successfully",
        data: events.data,
        meta: events.meta,
      });
    }
  ),

  getMyAllEvents: catchAsync(
    async (req: TRequest, res: TResponse, next: TNext) => {
      const { userId } = req.user as JwtPayload;
      const events = await EventsService.getMyAllEvents(
        req.query as Record<string, string>,
        userId
      );

      sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "My Events retrived successfully",
        data: events.data,
        meta: events.meta,
      });
    }
  ),

  getEventDetails: catchAsync(
    async (req: TRequest, res: TResponse, next: TNext) => {
      const event = await EventsService.getEventDetails(req.params.slug as string);

      sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Event Details retrived successfully",
        data: event,
      });
    }
  ),

  getSingleEvent: catchAsync(
    async (req: TRequest, res: TResponse, next: TNext) => {
      const { userId } = req.user as JwtPayload;
      const event = await EventsService.getSingleEvent(
        req.params.eventId as string,
        userId
      );

      sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Single Event retrived successfully",
        data: event,
      });
    }
  ),

  updateEvent: catchAsync(
    async (req: TRequest, res: TResponse, next: TNext) => {
      const payload: IEvent = {
        ...req.body,
        image: req?.file?.path,
      };

      const event = await EventsService.updateEvent(
        req.params.eventId as string,
        payload,
        req.user as JwtPayload
      );

      sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Event updated successfully",
        data: event,
      });
    }
  ),

  deleteEvent: catchAsync(
    async (req: TRequest, res: TResponse, next: TNext) => {
      await EventsService.deleteEvent(
        req.params.eventId as string,
        req.user as JwtPayload
      );

      sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Event deleted successfully",
        data: null,
      });
    }
  ),
};
