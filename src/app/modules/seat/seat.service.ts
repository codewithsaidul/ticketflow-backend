import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errorHelpers/AppError";
import { Event } from "../events/events.model";
import { EventMode } from "../events/events.interface";
import { Seat } from "./seat.model";
import { startSession } from "mongoose";
import { io } from "../../../server";
import { SeatStatus } from "./seat.interface";

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

  syncSeatLocks: async (seatIds: string[], userId: string, eventId: string) => {
    const session = await startSession();
    try {
      session.startTransaction();

      // ১. রিসেট: এই ইউজার আগে যা যা লক করেছিল, সব রিলিজ করে দাও (যাতে ডুপ্লিকেট না থাকে)
      await Seat.updateMany(
        { event: eventId, lockedBy: userId, status: SeatStatus.LOCKED },
        { status: SeatStatus.AVAILABLE, lockedBy: null, lockExpiresAt: null },
        { session }
      );

      if (seatIds.length > 0) {
        // ২. নতুন সিটগুলো লক করো (Atomic Check)
        // চেক: সিটগুলো কি আসলেই অ্যাভেইলেবল? (নাকি অন্য কেউ নিয়ে নিছে?)
        const seatsToLock = await Seat.find({
          _id: { $in: seatIds },
          event: eventId,
          status: SeatStatus.AVAILABLE,
        }).session(session);

        if (seatsToLock.length !== seatIds.length) {
          throw new AppError(
            StatusCodes.CONFLICT,
            "Some selected seats are no longer available."
          );
        }

        // ৩. আপডেট: সিট লক করা (৫ মিনিটের জন্য)
        await Seat.updateMany(
          { _id: { $in: seatIds } },
          {
            status: SeatStatus.LOCKED,
            lockedBy: userId,
            lockExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
          },
          { session }
        );
      }

      await session.commitTransaction();

      if (io) {
        io.to(eventId).emit("seats-updated", {
          updaterId: userId,
          lockedSeatIds: seatIds,
        });
      }

      return "Seats synced successfully";
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  },
};
