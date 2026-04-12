import { StatusCodes } from "http-status-codes";
import { ClientSession, Types } from "mongoose";
import { io } from "../../../server";
import { redisClient } from "../../config/redis.config";
import { AppError } from "../../errorHelpers/AppError";
import { EventMode } from "../events/events.interface";
import { Event } from "../events/events.model";
import { SeatStatus } from "./seat.interface";
import { Seat } from "./seat.model";

interface ISyncSeatResult {
  locked: string[];
  unlocked: string[];
  failed: string[];
}

export const SeatService = {
  getSeatsByEventId: async (eventId: string) => {
    const event = await Event.findById(eventId).select("seatLayout mode title");

    if (!event) {
      throw new AppError(StatusCodes.NOT_FOUND, "This Event is not exist!");
    }

    if (event.mode !== EventMode.ASSIGNED) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "This event does not have a seat booking system",
      );
    }

    const seats = await Seat.find({ event: eventId }).sort({
      row: 1,
      number: 1,
    });

    const seatsWithLocks = await Promise.all(
      seats.map(async (seat) => {
        const lockedBy = await redisClient.get(
          `seat_lock:${eventId}:${seat._id}`,
        );

        return {
          ...seat.toObject(),
          status: lockedBy ? SeatStatus.LOCKED : seat.status,
          lockedBy: lockedBy || null,
        };
      }),
    );

    return {
      data: seatsWithLocks,
      meta: {
        totalRows: event.seatLayout?.rows,
        totalCols: event.seatLayout?.cols,
        basePrice: event.seatLayout?.basePrice,
      },
    };
  },

  syncSeatLocks: async (seatIds: string[], userId: string, eventId: string) => {
    const LOCK_TTL = 300;
    const results: ISyncSeatResult = { locked: [], unlocked: [], failed: [] };

    for (const seatId of seatIds) {
      const lockKey = `seat_lock:${eventId}:${seatId}`;
      const currentLockOwner = await redisClient.get(lockKey);

      if (currentLockOwner === userId) {
        await redisClient.del(lockKey);
        results.unlocked.push(seatId);
      } else if (!currentLockOwner) {
        await redisClient.set(lockKey, userId, { EX: LOCK_TTL, NX: true });
        results.locked.push(seatId);
      }
    }
    if (io) {
      io.to(eventId).emit("seats-updated", { updaterId: userId });
    }

    return { data: results };
  },

  releaseSpecificLocks: async (
    seatIds: Types.ObjectId[],
    eventId: string,
    userId: string,
    session: ClientSession,
  ) => {
    await Seat.updateMany(
      { _id: { $in: seatIds }, status: SeatStatus.LOCKED },
      {
        $set: {
          status: SeatStatus.AVAILABLE,
          lockedBy: null,
          lockExpiresAt: null,
        },
      },
      { session },
    );

    for (const id of seatIds) {
      await redisClient.del(`seat_lock:${eventId}:${id.toString()}`);
    }

    if (io) {
      io.to(eventId).emit("seats-updated", {
        updaterId: userId,
        releasedSeatIds: seatIds.map((id) => id.toString()),
      });
    }
  },
};
