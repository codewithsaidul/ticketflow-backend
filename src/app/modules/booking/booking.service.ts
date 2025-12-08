import { startSession, Types } from "mongoose";
import { Event } from "../events/events.model";
import { AppError } from "../../errorHelpers/AppError";
import { StatusCodes } from "http-status-codes";
import { Seat } from "../seat/seat.model";
import { SeatStatus } from "../seat/seat.interface";
import { Booking } from "./booking.model";
import { BookingStatus } from "./booking.interface";
import { PaymentStatus } from "../payment/payment.interface";
import { getTransactionId } from "../../utils/getTransactionId";
import { Payment } from "../payment/payment.model";
import { ISSLCommerz } from "../sslCommerz/sslCommerz.interface";
import { SSLServices } from "../sslCommerz/sslCommerz.service";
import { User } from "../user/user.model";
import { QueryBuilder } from "../../utils/queryBuilder";
import { SeatService } from "../seat/seat.service";

const BOOKING_TIMEOUT_MS = 5 * 60 * 1000;

export const BookingService = {
  createBooking: async (payload: {
    seatIds: string[];
    eventId: string;
    userId: string;
  }) => {
    const transactionId = getTransactionId();
    const session = await startSession();

    try {
      session.startTransaction();

      const { seatIds, eventId, userId } = payload;

      const [event, user] = await Promise.all([
        Event.findById(eventId).session(session),
        User.findById(userId).session(session),
      ]);

      if (!event) throw new AppError(StatusCodes.NOT_FOUND, "Event not found");
      if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");

      const uniqueSeatIds = [...new Set(seatIds)];

      const availableSeats = await Seat.find({
        _id: { $in: uniqueSeatIds },
        event: eventId,
        $or: [
          { status: SeatStatus.AVAILABLE },
          { status: SeatStatus.LOCKED, lockedBy: userId },
        ],
      }).session(session);

      if (availableSeats.length !== uniqueSeatIds.length) {
        throw new AppError(
          StatusCodes.CONFLICT,
          "One or more seats are already booked or unavailable"
        );
      }

      const totalAmount = availableSeats.reduce(
        (sum, seat) => sum + seat.price,
        0
      );

      const booking = await Booking.create(
        [
          {
            event: eventId,
            user: userId,
            seats: uniqueSeatIds,
            totalAmount,
            status: BookingStatus.PENDING,
          },
        ],
        { session }
      );

      if (!booking.length) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Failed to create booking");
      }

      const payment = await Payment.create(
        [
          {
            booking: booking[0]._id,
            transactionId: transactionId,
            amount: totalAmount,
            status: PaymentStatus.UNPAID,
          },
        ],
        { session }
      );

      const updatedBooking = await Booking.findByIdAndUpdate(
        booking[0]._id,
        { payment: payment[0]._id, transactionId: transactionId },
        { new: true, runValidators: true, session }
      );

      await Seat.updateMany(
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
        }
      );

      const sslPayload: ISSLCommerz = {
        amount: totalAmount,
        transactionId: transactionId,
        name: user.name,
        email: user.email,
        phoneNumber: user.phone || "01700000000",
        address: user.location || "Dhaka",
      };

      const sslPayment = await SSLServices.sslPaymentInit(sslPayload);

      await session.commitTransaction();
      session.endSession();

      return {
        paymentUrl: sslPayment.GatewayPageURL,
        booking: updatedBooking,
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  },

  getAllBookings: async (query: Record<string, unknown>) => {
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

  getHostBookings: async (hostId: string, query: Record<string, unknown>) => {
    const hostEvents = await Event.find({ organizer: hostId }).select("_id");
    const eventIds = hostEvents.map((event) => event._id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchConditions: any = {
      event: { $in: eventIds },
      isDeleted: false,
    };

    if (query.searchTerm) {
      const regex = new RegExp(query.searchTerm as string, "i");

      const matchingEvents = await Event.find({
        _id: { $in: eventIds },
        title: regex,
      }).select("_id");
      const matchingEventIds = matchingEvents.map((e) => e._id);

      const matchingUsers = await User.find({
        name: regex,
      }).select("_id");
      const matchingUserIds = matchingUsers.map((u) => u._id);

      matchConditions.$or = [
        { event: { $in: matchingEventIds } },
        { user: { $in: matchingUserIds } },
      ];

      delete query.searchTerm;
    }

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

  getMyBookings: async (userId: string, query: Record<string, unknown>) => {
    const queryBuilder = new QueryBuilder(
      Booking.find({ user: userId, isDeleted: false }),
      query
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

  cancelUnpaidExpiredBookings: async () => {
    const session = await Booking.startSession();
    let releasedCount = 0;

    try {
      session.startTransaction();
      const expirationTime = new Date(
        new Date().getTime() - BOOKING_TIMEOUT_MS
      );

      const expiredBookings = await Booking.find({
        status: BookingStatus.PENDING,
        createdAt: { $lt: expirationTime },
      })
        .populate("seats")
        .populate("payment") 
        .session(session);

      if (expiredBookings.length === 0) {
        await session.commitTransaction();
        return { releasedCount: 0 };
      }

      const bookingsByEvent = new Map<
        string,
        {
          seats: Types.ObjectId[];
          bookingIds: Types.ObjectId[];
          paymentIds: Types.ObjectId[];
        } 
      >();

      expiredBookings.forEach((booking) => {
        if (!booking.payment) return;

        const eventId = booking.event.toString();
        const seats = booking.seats.map((s) => s._id);
        const paymentId = booking.payment._id;

        if (!bookingsByEvent.has(eventId)) {
          bookingsByEvent.set(eventId, {
            seats: [],
            bookingIds: [],
            paymentIds: [],
          });
        }

        const entry = bookingsByEvent.get(eventId);
        entry?.seats.push(...seats);
        entry?.bookingIds.push(new Types.ObjectId(booking._id));
        entry?.paymentIds.push(paymentId);
        releasedCount += 1;
      });

      const allPaymentIdsToFail = Array.from(bookingsByEvent.values()).flatMap(
        (data) => data.paymentIds
      );

      if (allPaymentIdsToFail.length > 0) {
        await Payment.updateMany(
          { _id: { $in: allPaymentIdsToFail } },
          { $set: { status: PaymentStatus.FAILED } },
          { session }
        );
      }

      for (const [eventId, data] of bookingsByEvent.entries()) {
        await Booking.updateMany(
          { _id: { $in: data.bookingIds } },
          { $set: { status: BookingStatus.EXPIRED } },
          { session }
        );

        await SeatService.releaseSpecificLocks(
          data.seats,
          eventId,
          "SYSTEM_CRON_JOB",
          session
        );
      }

      await session.commitTransaction();
      return { releasedCount };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  },
};
