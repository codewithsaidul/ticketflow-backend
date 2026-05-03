import { StatusCodes } from "http-status-codes";
import { JwtPayload } from "jsonwebtoken";
import { startSession, Types } from "mongoose";
import { AppError } from "../../errorHelpers/AppError";
import { slugifyUnique } from "../../utils/slugify";
import { ISeat, SeatStatus } from "../seat/seat.interface";
import { UserRole } from "../user/user.interface";
import { EventMode, EventStatus, IEvent } from "./events.interface";
import { Event } from "./events.model";
import { EventsRepository } from "./events.repository";

export const EventsService = {
  createEvent: async (payload: IEvent, userId: string) => {
    const session = await startSession();

    try {
      session.startTransaction();

      const uniqueSlug = await slugifyUnique(
        [payload.title as string],
        Event,
        50,
      );
      const newEvent = await EventsRepository.createEvent(
        { ...payload, organizer: new Types.ObjectId(userId), slug: uniqueSlug },

        session,
      );

      if (!newEvent || newEvent.length === 0) {
        throw new Error("Failed to create event");
      }

      const eventData = newEvent[0];

      if (eventData.mode === EventMode.ASSIGNED && payload.seatLayout) {
        // Logic to create seats based on seatLayout
        const { rows, cols, basePrice, matrix } = payload.seatLayout;
        const seatsToCreate: Partial<ISeat>[] = [];

        // Generate seats based on the matrix
        for (let r = 0; r < rows; r++) {
          const rowLabel = String.fromCharCode(65 + r); // 65 = 'A', 66 = 'B'

          for (let c = 0; c < cols; c++) {
            const isSeatPresent = matrix ? matrix[r]?.[c] === 1 : true;

            if (isSeatPresent) {
              seatsToCreate.push({
                event: eventData._id,
                row: rowLabel,
                number: c + 1,
                label: `${rowLabel}${c + 1}`,
                price: basePrice,
                status: SeatStatus.AVAILABLE,
              });
            }
          }
        }

        // Here you would typically call Seat.create(seatsToCreate, { session });
        if (seatsToCreate.length > 0) {
          await EventsRepository.createSeats(seatsToCreate, session);
        }
      }

      await session.commitTransaction();
      session.endSession();

      return eventData;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  },

  getAllEvents: async (query: Record<string, string>) => {
    const { data, meta } = await EventsRepository.getAllEvents(query);

    return { data, meta };
  },

  getMyAllEvents: async (query: Record<string, string>, userId: string) => {
    const { data, meta } = await EventsRepository.getMyAllEvents(query, userId);

    return { data, meta };
  },

  getEventDetails: async (slug: string) => {
    const event = await EventsRepository.findEventBySlug(slug);

    if (!event) {
      throw new AppError(StatusCodes.NOT_FOUND, "This event is not found!");
    }

    return event;
  },

  getSingleEvent: async (eventId: string, userId: string) => {
    const event = await EventsRepository.findEventById(eventId);

    if (!event) {
      throw new AppError(StatusCodes.NOT_FOUND, "Event not found!");
    }

    if (event.organizer.toString() !== userId) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Your not authorized to view this event",
      );
    }

    return event;
  },

  updateEvent: async (
    eventId: string,
    payload: Partial<IEvent>,
    user: JwtPayload,
  ) => {
    const event = await Event.findById(eventId);

    if (!event) {
      throw new AppError(StatusCodes.NOT_FOUND, "Event not found!");
    }

    const isOwner = event.organizer.toString() === user.userId;
    const isAdmin =
      user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN;

    if (!isOwner && !isAdmin) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "You are not authorized to update this event",
      );
    }

    // if (payload.mode || payload.seatLayout || payload.organizer) {
    //   throw new AppError(
    //     StatusCodes.BAD_REQUEST,
    //     "You cannot change Seat Layout, Mode, or Organizer of an existing event"
    //   );
    // }

    if (payload.status) {
      const newStatus = payload.status;

      if (isAdmin && !isOwner) {
        const allowedStatuses = [EventStatus.ACTIVE, EventStatus.CANCELLED];

        if (!allowedStatuses.includes(newStatus as EventStatus)) {
          throw new AppError(
            StatusCodes.BAD_REQUEST,
            "Admins can only change status to ACTIVE or CANCELLED (Moderation Purpose)",
          );
        }
      }

      if (isOwner && !isAdmin) {
        const allowedOwnerStatuses = [
          EventStatus.ACTIVE,
          EventStatus.POSTPONED,
          EventStatus.CANCELLED,
          EventStatus.PENDING,
          EventStatus.FINISHED,
        ];

        if (!allowedOwnerStatuses.includes(newStatus as EventStatus)) {
          throw new AppError(
            StatusCodes.BAD_REQUEST,
            "Invalid status update request by Host",
          );
        }
      }
    }

    if (payload.title) {
      payload.slug = await slugifyUnique([payload.title as string], Event, 50);
    }

    const updatedEvent = await EventsRepository.updateEvent(eventId, payload);

    return updatedEvent;
  },

  deleteEvent: async (eventId: string, user: JwtPayload) => {
    const session = await startSession();

    try {
      session.startTransaction();

      const event = await Event.findById(eventId);

      if (!event) {
        throw new AppError(StatusCodes.NOT_FOUND, "Event not found!");
      }

      const isOwner = event.organizer.toString() === user.userId;
      const isAdmin =
        user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN;

      if (!isOwner && !isAdmin) {
        throw new AppError(
          StatusCodes.FORBIDDEN,
          "You are not authorized to delete this event",
        );
      }

      await EventsRepository.deleteSeatsByEvent(event._id.toString(), session);
      await EventsRepository.deleteEventById(eventId, session);

      await session.commitTransaction();
      session.endSession();
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  },
};
