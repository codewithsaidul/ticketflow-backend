// seat.socket.ts

import { Server, Socket } from "socket.io";
import { redisClient } from "../../config/redis.config";
import {
  SeatActionPayload,
  SeatErrorPayload,
  SeatsUpdatedPayload,
} from "./seat.interface";

export const seatSocketHandler = (io: Server, socket: Socket): void => {
  socket.on(
    "seat-action",
    async (payload: SeatActionPayload): Promise<void> => {
      try {
        const { eventId, seatId, userId } = payload;
        console.log("🚀 ~ seatSocketHandler ~ eventId:", eventId)

        if (!eventId || !seatId || !userId) {
          const errorPayload: SeatErrorPayload = {
            seatId,
            message: "Invalid payload",
          };
          socket.emit("seat-error", errorPayload);
          return;
        }

        const key = `seat_lock:${eventId}:${seatId}`;
        const LOCK_TTL = 300;

        const current = await redisClient.get(key);

        // 🔓 unlock (if owner)
        if (current === userId) {
          await redisClient.del(key);

          const response: SeatsUpdatedPayload = {
            seatId,
            userId,
          };

          io.to(eventId).emit("seats-updated", response);
          return;
        }

        // 🔒 atomic lock
        const success = await redisClient.set(key, userId, {
          EX: LOCK_TTL,
          NX: true,
        });

        if (success !== "OK") {
          const errorPayload: SeatErrorPayload = {
            seatId,
            message: "Seat already locked by another user",
          };

          socket.emit("seat-error", errorPayload);
          return;
        }

        const response: SeatsUpdatedPayload = {
          seatId,
          userId,
        };

        io.to(eventId).emit("seats-updated", response);
      } catch {
        const errorPayload: SeatErrorPayload = {
          seatId: payload?.seatId,
          message: "Internal server error",
        };

        socket.emit("seat-error", errorPayload);
      }
    },
  );
};
