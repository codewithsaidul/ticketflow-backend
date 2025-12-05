import { startSession } from "mongoose";
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

      // remove duplicate seat ids if have on payload
      const uniqueSeatIds = [...new Set(seatIds)];

      // atomic checking: Seats are available or not
      const availableSeats = await Seat.find({
        _id: { $in: uniqueSeatIds },
        event: eventId,
        $or: [
          { status: SeatStatus.AVAILABLE }, // সিট খালি আছে
          { status: SeatStatus.LOCKED, lockedBy: userId }, // অথবা সিটটা এই ইউজারই লক করে রেখেছে
        ],
      }).session(session);

      // checking user requested seats available or not. if not then maybe someone booked seat
      if (availableSeats.length !== uniqueSeatIds.length) {
        throw new AppError(
          StatusCodes.CONFLICT,
          "One or more seats are already booked or unavailable"
        );
      }

      // calculating total price
      const totalAmount = availableSeats.reduce(
        (sum, seat) => sum + seat.price,
        0
      );

      // creating a new booking (Pending State)
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

  getHostBookings: async (hostId: string, query: Record<string, unknown>) => {
    const hostEvents = await Event.find({ organizer: hostId }).select("_id");
    const eventIds = hostEvents.map((event) => event._id);

    const queryBuilder = new QueryBuilder(
      Booking.find({ event: { $in: eventIds }, isDeleted: false }),
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
};
