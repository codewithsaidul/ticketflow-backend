import { ClientSession } from "mongoose";
import { IPayment } from "../payment/payment.interface";
import { Payment } from "../payment/payment.model";
import { SeatStatus } from "../seat/seat.interface";
import { Seat } from "../seat/seat.model";
import {
  BookingStatus,
  IBooking,
  IBookingMatchCondition,
} from "./booking.interface";
import { Booking } from "./booking.model";
import { ISSLCommerz } from "../sslCommerz/sslCommerz.interface";
import { SSLServices } from "../sslCommerz/sslCommerz.service";
import { Types } from "mongoose";
import { User } from "../user/user.model";
import { Event } from "../events/events.model";
import { QueryBuilder } from "../../utils/queryBuilder";

export const BookingsRepository = {
  findEventAndUserAndBooking: async (
    eventId: string,
    userId: string,
    session: ClientSession,
  ) => {
    const [event, user, booking] = await Promise.all([
      Event.findById(eventId).session(session),
      User.findById(userId).session(session),
      Booking.find({
        event: eventId,
        user: userId,
        status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      }).session(session),
    ]);

    return { event, user, booking };
  },

  availableSeats: async (
    uniqueSeatIds: string[],
    eventId: string,
    userId: string,
    session: ClientSession,
  ) => {
    return await Seat.find({
      _id: { $in: uniqueSeatIds },
      event: eventId,
      $or: [
        { status: SeatStatus.AVAILABLE },
        { status: SeatStatus.LOCKED, lockedBy: userId },
      ],
    }).session(session);
  },

  createBooking: async (payload: Partial<IBooking>, session: ClientSession) => {
    return await Booking.create([payload], { session });
  },

  createPayment: async (payload: Partial<IPayment>, session: ClientSession) => {
    return await Payment.create([payload], { session });
  },

  updateBookingById: async (
    bookingId: string,
    paymentId: Types.ObjectId,
    transactionId: string,
    session: ClientSession,
  ) => {
    return await Booking.findByIdAndUpdate(
      bookingId,
      { payment: paymentId, transactionId: transactionId },
      { new: true, runValidators: true, session },
    );
  },

  updateSeats: async (
    uniqueSeatIds: string[],
    userId: string,
    session: ClientSession,
  ) => {
    return await Seat.updateMany(
      {
        _id: { $in: uniqueSeatIds },
      },
      {
        status: SeatStatus.LOCKED,
        lockedBy: userId,
        lockExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
      {
        session,
      },
    );
  },

  sslPaymentInit: async (payload: ISSLCommerz) => {
    return await SSLServices.sslPaymentInit(payload);
  },

  getAllBookings: async (query: Record<string, string>) => {
    const queryBuilder = new QueryBuilder(Booking.find(), query);

    const bookings = queryBuilder
      .filter()
      .sort()
      .fields()
      .paginate()
      .populate("event", "title date location image seatLayout.basePrice")
      .populate("payment", "transactionId status amount")
      .populate("seats", "label number")
      .populate("user", "name email phone profileImg");

    const [data, meta] = await Promise.all([
      bookings.build(),
      queryBuilder.getMeta(),
    ]);

    return {
      meta,
      data,
    };
  },

  getHostEvents: async (hostId: string) => {
    return await Event.find({ organizer: hostId }).select("_id");
  },

  matchingEvents: async (eventIds: Types.ObjectId[], regex: RegExp) => {
    return await Event.find({
      _id: { $in: eventIds },
      title: regex,
    }).select("_id");
  },

  getBookingsByHost: async (
    matchConditions: IBookingMatchCondition,
    query: Record<string, string>,
  ) => {
    const queryBuilder = new QueryBuilder(Booking.find(matchConditions), query);

    const bookings = queryBuilder
      .filter()
      .sort()
      .fields()
      .paginate()
      .populate("event", "title date location image seatLayout.basePrice")
      .populate("payment", "transactionId status amount")
      .populate("seats", "label number")
      .populate("user", "name email phone profileImg");

    const [data, meta] = await Promise.all([
      bookings.build(),
      queryBuilder.getMeta(),
    ]);

    return {
      meta,
      data,
    };
  },

  getMyBookings: async (userId: string, query: Record<string, string>) => {
    const queryBuilder = new QueryBuilder(
      Booking.find({ user: userId, isDeleted: false }),
      query,
    );

    const bookings = queryBuilder
      .filter()
      .sort()
      .fields()
      .paginate()
      .populate("event", "title date location image seatLayout.basePrice")
      .populate("payment", "transactionId status amount")
      .populate("seats", "label number");

    const [data, meta] = await Promise.all([
      bookings.build(),
      queryBuilder.getMeta(),
    ]);

    return {
      meta,
      data,
    };
  },

  findBookingById: async (bookingId: string) => {
    return await Booking.findById(bookingId)
      .populate("event", "title location date image")
      .populate("user", "name email")
      .populate("seats", "label");
  },

  findExpiredBookings: async (expirationTime: Date, session: ClientSession) => {
    return await Booking.find({
      status: { $in: [BookingStatus.PENDING, BookingStatus.FAILED] },
      createdAt: { $lt: expirationTime },
    })
      .populate("seats")
      .populate("payment")
      .session(session);
  },

  updateManyBookings: async (
    bookingIds: Types.ObjectId[],
    session: ClientSession,
  ) => {
    return await Booking.updateMany(
      { _id: { $in: bookingIds } },
      { $set: { status: BookingStatus.EXPIRED } },
      { session },
    );
  },
};
