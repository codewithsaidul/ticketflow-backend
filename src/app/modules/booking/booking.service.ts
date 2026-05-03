import { StatusCodes } from "http-status-codes";
import { startSession, Types } from "mongoose";
import qrcode from "qrcode";
import { AppError } from "../../errorHelpers/AppError";
import { getTransactionId } from "../../utils/getTransactionId";
import { PaymentStatus } from "../payment/payment.interface";
import { Payment } from "../payment/payment.model";
import { SeatService } from "../seat/seat.service";
import { ISSLCommerz } from "../sslCommerz/sslCommerz.interface";
import { User } from "../user/user.model";
import { BookingStatus, IBookingMatchCondition } from "./booking.interface";
import { Booking } from "./booking.model";
import { BookingsRepository } from "./bookings.repository";

const BOOKING_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_TICKETS_PER_USER = 4;

export const BookingService = {
  createBooking: async (payload: {
    seatIds: string[];
    eventId: string;
    userId: string;
  }) => {
    const transactionId = getTransactionId();
    const session = await startSession();

    let bookingResult = null;
    let userDetails = null;

    try {
      session.startTransaction();

      const { seatIds, eventId, userId } = payload;

      const {
        event,
        user,
        booking: existingBookings,
      } = await BookingsRepository.findEventAndUserAndBooking(
        eventId,
        userId,
        session,
      );

      if (!event) throw new AppError(StatusCodes.NOT_FOUND, "Event not found");
      if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");

      const totalBookedSeatsCount = existingBookings.reduce(
        (count, b) => count + b.seats.length,
        0,
      );

      const remainingLimit = MAX_TICKETS_PER_USER - totalBookedSeatsCount;

      if (totalBookedSeatsCount >= MAX_TICKETS_PER_USER) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `You have already reached the maximum limit of ${MAX_TICKETS_PER_USER} tickets for this event.`,
        );
      }

      const uniqueSeatIds = [...new Set(seatIds)];

      if (uniqueSeatIds.length > remainingLimit) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `You can only book ${remainingLimit} more ticket(s) for this event.`,
        );
      }

      const availableSeats = await BookingsRepository.availableSeats(
        uniqueSeatIds,
        eventId,
        userId,
        session,
      );

      if (availableSeats.length !== uniqueSeatIds.length) {
        throw new AppError(
          StatusCodes.CONFLICT,
          "One or more seats are already booked or unavailable",
        );
      }

      const totalAmount = availableSeats.reduce(
        (sum, seat) => sum + seat.price,
        0,
      );

      const booking = await BookingsRepository.createBooking(
        {
          event: new Types.ObjectId(eventId),
          user: new Types.ObjectId(userId),
          seats: uniqueSeatIds.map((id) => new Types.ObjectId(id)),
          totalAmount,
          status: BookingStatus.PENDING,
        },

        session,
      );

      if (!booking.length) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Failed to create booking");
      }

      const payment = await BookingsRepository.createPayment(
        {
          booking: new Types.ObjectId(booking[0]._id),
          transactionId: transactionId,
          amount: totalAmount,
          status: PaymentStatus.UNPAID,
        },
        session,
      );

      const updatedBooking = await BookingsRepository.updateBookingById(
        booking[0]._id,
        payment[0]._id,
        transactionId,
        session,
      );

      await BookingsRepository.updateSeats(uniqueSeatIds, userId, session);

      bookingResult = updatedBooking;
      userDetails = user;

      await session.commitTransaction();
      session.endSession();
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }

    try {
      const sslPayload: ISSLCommerz = {
        amount: bookingResult?.totalAmount as number,
        transactionId: transactionId,
        name: userDetails.name,
        email: userDetails.email,
        phoneNumber: userDetails.phone || "01700000000",
        address: userDetails.location || "Dhaka",
      };

      const sslPayment = await BookingsRepository.sslPaymentInit(sslPayload);

      return {
        paymentUrl: sslPayment.GatewayPageURL,
        booking: bookingResult,
      };
    } catch {
      return {
        paymentUrl: null,
        booking: bookingResult,
      };
    }
  },

  getAllBookings: async (query: Record<string, string>) => {
    const { data, meta } = await BookingsRepository.getAllBookings(query);

    return {
      meta,
      data,
    };
  },

  getHostBookings: async (hostId: string, query: Record<string, string>) => {
    const hostEvents = await BookingsRepository.getHostEvents(hostId);
    const eventIds = hostEvents.map((event) => event._id);

    const matchConditions: IBookingMatchCondition = {
      event: { $in: eventIds },
      isDeleted: false,
    };

    if (query.searchTerm) {
      const regex = new RegExp(query.searchTerm as string, "i");

      const matchingEvents = await BookingsRepository.matchingEvents(
        eventIds,
        regex,
      );

      const matchingEventIds = matchingEvents.map((e) => e._id);

      const matchingUsers = await User.find({
        name: regex,
      }).select("_id");
      const matchingUserIds = matchingUsers.map((u) => new Types.ObjectId(u._id));

      matchConditions.$or = [
        { event: { $in: matchingEventIds } },
        { user: { $in: matchingUserIds } },
      ];

      delete query.searchTerm;
    }

    const { data, meta } = await BookingsRepository.getBookingsByHost(matchConditions, query)

    return {
      meta,
      data,
    };
  },

  getMyBookings: async (userId: string, query: Record<string, string>) => {
    const { data, meta } = await BookingsRepository.getMyBookings(userId, query);

    return {
      meta,
      data,
    };
  },

  generateTicketDetails: async (bookingId: string, userId: string) => {
    const booking = await BookingsRepository.findBookingById(bookingId);

    if (!booking) {
      throw new AppError(StatusCodes.NOT_FOUND, "Ticket not found");
    }

    if (booking.user._id.toString() !== userId) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "You can not see other booking details",
      );
    }

    const qrPayload = JSON.stringify({
      bookingId: bookingId,
      scanTime: Date.now(),
    });

    const qrCodeImage = await qrcode.toDataURL(qrPayload, {
      errorCorrectionLevel: "H",
      type: "image/png",
      width: 256,
    });

    return {
      bookingDetails: booking,
      qrCodeImage: qrCodeImage,
    };
  },

  cancelUnpaidExpiredBookings: async () => {
    const session = await Booking.startSession();
    let releasedCount = 0;

    try {
      session.startTransaction();
      const expirationTime = new Date(
        new Date().getTime() - BOOKING_TIMEOUT_MS,
      );

      const expiredBookings = await BookingsRepository.findExpiredBookings(expirationTime, session);

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
        (data) => data.paymentIds,
      );

      if (allPaymentIdsToFail.length > 0) {
        await Payment.updateMany(
          { _id: { $in: allPaymentIdsToFail } },
          { $set: { status: PaymentStatus.FAILED } },
          { session },
        );
      }

      for (const [eventId, data] of bookingsByEvent.entries()) {
        await BookingsRepository.updateManyBookings(data.bookingIds, session);

        await SeatService.releaseSpecificLocks(
          data.seats,
          eventId,
          "SYSTEM_CRON_JOB",
          session,
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
