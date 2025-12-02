import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errorHelpers/AppError";
import { Event } from "../events/events.model";
import { EventMode } from "../events/events.interface";
import { Seat } from "./seat.model";

export const SeatService = {
  getSeatsByEventId: async (eventId: string) => {
    const event = await Event.findById(eventId).select("seatLayout mode title");

    if (!event) {
      throw new AppError(StatusCodes.NOT_FOUND, "This Event is not exist!");
    }

    if (event.mode !== EventMode.ASSIGNED) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "This event does not have a seat booking system"
      );
    }

    const seats = await Seat.find({ event: eventId }).sort({
      row: 1,
      number: 1,
    });

    return {
      data: seats,
      meta: {
        totalRows: event.seatLayout?.rows,
        totalCols: event.seatLayout?.cols,
        basePrice: event.seatLayout?.basePrice,
      },
    };
  },
};
