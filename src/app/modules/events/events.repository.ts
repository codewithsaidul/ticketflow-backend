import { ClientSession } from "mongoose";
import { IEvent } from "./events.interface";
import { Event } from "./events.model";
import { ISeat } from "../seat/seat.interface";
import { Seat } from "../seat/seat.model";
import { QueryBuilder } from "../../utils/queryBuilder";
import { eventSearchableFields } from "./events.constants";

export const EventsRepository = {
  createEvent: async (payload: Partial<IEvent>, session: ClientSession) => {
    return await Event.create([payload], { session });
  },

  createSeats: async (seats: Partial<ISeat>[], session: ClientSession) => {
    return await Seat.insertMany(seats, { session });
  },

  getAllEvents: async (query: Record<string, string>) => {
    const queryBuilder = new QueryBuilder(Event.find(), query);

    const events = queryBuilder
      .search(eventSearchableFields)
      .filter()
      .sort()
      .fields()
      .paginate()
      .populate("organizer", "name email phone profileImg");

    const [data, meta] = await Promise.all([
      events.build(),
      queryBuilder.getMeta(),
    ]);

    return { data, meta };
  },

  getMyAllEvents: async (query: Record<string, string>, userId: string) => {
    const queryBuilder = new QueryBuilder(
      Event.find({ organizer: userId }),
      query,
    );

    const events = queryBuilder
      .search(eventSearchableFields)
      .filter()
      .sort()
      .fields()
      .paginate()
      .populate("organizer", "name email profileImg");

    const [data, meta] = await Promise.all([
      events.build(),
      queryBuilder.getMeta(),
    ]);

    return { data, meta };
  },

  findEventBySlug: async (slug: string) => {
    return await Event.findOne({ slug }).populate(
      "organizer",
      "name email profileImg",
    );
  },

  findEventById: async (eventId: string) => {
    return await Event.findById(eventId);
  },

  updateEvent: async (eventId: string, payload: Partial<IEvent>) => {
    return await Event.findByIdAndUpdate(eventId, payload, {
      new: true,
      runValidators: true,
    });
  },

  deleteEventById: async (eventId: string, session: ClientSession) => {
    return await Event.findByIdAndDelete(eventId, { session });
  },

  deleteSeatsByEvent: async (eventId: string, session: ClientSession) => {
    return await Seat.deleteMany({ event: eventId }, { session });
  }
};
