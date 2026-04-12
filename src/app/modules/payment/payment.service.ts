import { AppError } from "../../errorHelpers/AppError";
import { sendEmail } from "../../utils/sendEmail";
import { ISSLCommerz } from "../sslCommerz/sslCommerz.interface";
import { SSLServices } from "../sslCommerz/sslCommerz.service";
import { IUser } from "../user/user.interface";
import httpsStatusCode, { StatusCodes } from "http-status-codes";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { uploadBufferToCloudinary } from "../../config/cloudinary.config";
import { startSession, Types } from "mongoose";
import { Booking } from "../booking/booking.model";
import { BookingStatus } from "../booking/booking.interface";
import { Seat } from "../seat/seat.model";
import { SeatStatus } from "../seat/seat.interface";
import { IEvent } from "../events/events.interface";
import { generatePDF, IInvoice } from "../../utils/invoice";
import { Payment } from "./payment.model";
import { PaymentStatus } from "./payment.interface";
import { io } from "../../../server";
import { redisClient } from "../../config/redis.config";

const BOOKING_TIMEOUT_MS = 5 * 60 * 1000;

export const PaymentServices = {
  initPayment: async (bookingId: string) => {
    const booking = await Booking.findById(bookingId).populate("user");

    if (!booking) {
      throw new AppError(httpsStatusCode.NOT_FOUND, "Booking Not Found");
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      throw new AppError(httpsStatusCode.BAD_REQUEST, "Booking already paid");
    }

    const now = new Date();
    const createdAt = new Date(booking.createdAt as string);
    const isExpired = now.getTime() - createdAt.getTime() > BOOKING_TIMEOUT_MS;

    if (booking.status === BookingStatus.PENDING && isExpired) {
      booking.status = BookingStatus.EXPIRED;
      await booking.save();

      throw new AppError(
        StatusCodes.GONE, // 410 GONE indicates the resource (the lock) is no longer available
        "Booking time limit expired. Please select seats again.",
      );
    }

    const user = booking.user as unknown as IUser;

    const sslPayload: ISSLCommerz = {
      name: user.name,
      email: user.email,
      phoneNumber: user.phone || "01700000000",
      address: "Dhaka",
      amount: booking.totalAmount,
      transactionId: booking.transactionId as string,
    };

    const sslPayment = await SSLServices.sslPaymentInit(sslPayload);

    return {
      paymentUrl: sslPayment,
    };
  },

  successPayment: async (query: Record<string, string>) => {
    const session = await startSession();
    try {
      session.startTransaction();

      const { transactionId } = query;

      const booking = await Booking.findOne({ transactionId }).session(session);

      if (!booking) {
        throw new AppError(StatusCodes.NOT_FOUND, "Booking not found");
      }

      if (booking.status === BookingStatus.CONFIRMED) {
        await session.abortTransaction();
        return { success: true, message: "Already Paid" };
      }

      const updateBooking = await Booking.findByIdAndUpdate(
        booking._id,
        {
          status: BookingStatus.CONFIRMED,
          paymentStatus: "paid",
          paidAt: new Date(),
        },
        { new: true, runValidators: true, session },
      )
        .populate("event", "title date location")
        .populate("user", "name email");

      await Payment.findByIdAndUpdate(
        booking.payment,
        { status: PaymentStatus.PAID },
        { runValidators: true, new: true, session },
      );

      await Seat.updateMany(
        { _id: { $in: booking.seats } },
        {
          status: SeatStatus.BOOKED,
          paymentStatus: "paid",
          lockExpiresAt: null,
        },
        { session },
      );

      for (const seatId of booking.seats) {
        await redisClient.del(`seat_lock:${booking.event}:${seatId}`);
      }

      // ===================== Invoice Logic =====================
      try {
        const bdTime = toZonedTime(new Date(), "Asia/Dhaka");
        const formattedDate = format(bdTime, "MMMM dd, yyyy h:mm a");
        const eventDetails = updateBooking?.event as unknown as IEvent;
        const userDetails = updateBooking?.user as unknown as IUser;

        const invoiceData: IInvoice = {
          transactionId: transactionId,
          bookingDate: formattedDate,
          tourTitle: eventDetails.title,
          guestCount: booking.seats.length,
          totalAmount: booking.totalAmount,
          cusName: userDetails.name,
          cusEmail: userDetails.email,
          cusAddress: "Dhaka, Bangladesh",
          cusPhone: userDetails.phone || "N/A",
          invoiceNumber: Math.floor(100000 + Math.random() * 900000), // Random Invoice ID
        };

        // Generate PDF & Upload (If fails, code continues)
        const pdfBuffer = await generatePDF(invoiceData);
        const cloudinaryResult = await uploadBufferToCloudinary(
          pdfBuffer,
          "invoice",
        );

        // Send Email
        await sendEmail({
          to: userDetails.email,
          subject: "Ticket Confirmation - Velotix",
          templateName: "invoice",
          templateData: {
            ...invoiceData,
            downloadLink: cloudinaryResult?.secure_url,
          },
          attachments: [
            {
              filename: "ticket_invoice.pdf",
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ],
        });
      } catch (emailError) {
        // eslint-disable-next-line no-console
        console.error(
          "Invoice generation failed, but payment succeeded:",
          emailError,
        );
      }

      await session.commitTransaction();
      session.endSession();

      if (io) {
        io.to(booking.event.toString()).emit("seats-updated", {
          updaterId: "SYSTEM_PAYMENT_SUCCESS",
          releasedSeatIds: booking.seats,
        });
      }

      return { success: true, message: "Payment completed successfully" };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  },

  failPayment: async (query: Record<string, string>) => {
    const session = await startSession();
    try {
      session.startTransaction();

      const { transactionId } = query;

      const booking = await Booking.findOne({ transactionId }).session(session);
      if (!booking)
        throw new AppError(StatusCodes.NOT_FOUND, "Booking not found");

      // 1. Update Booking Status
      await Booking.findByIdAndUpdate(
        booking._id,
        {
          status: BookingStatus.FAILED, // ✅ Updated Enum
          paymentStatus: "failed",
        },
        { new: true, runValidators: true, session },
      );

      await Payment.findByIdAndUpdate(
        booking.payment,
        { status: PaymentStatus.FAILED },
        { runValidators: true, new: true, session },
      );

      // 2. 🔥 RELEASE SEATS (Make them Available again)
      await Seat.updateMany(
        { _id: { $in: booking.seats } },
        {
          status: SeatStatus.AVAILABLE, // Release lock
          lockedBy: null,
          lockExpiresAt: null,
        },
        { session },
      );

      await session.commitTransaction();
      session.endSession();

      return { success: false, message: "Payment Failed" };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  },

  cancelPayment: async (query: Record<string, string>) => {
    const session = await startSession();
    try {
      session.startTransaction();

      const { transactionId } = query;

      const booking = await Booking.findOne({ transactionId }).session(session);
      if (!booking)
        throw new AppError(StatusCodes.NOT_FOUND, "Booking not found");

      // 1. Update Booking Status
      await Booking.findByIdAndUpdate(
        booking._id,
        {
          status: BookingStatus.CANCELLED,
        },
        { new: true, runValidators: true, session },
      );

      await Payment.findByIdAndUpdate(
        booking.payment,
        { status: PaymentStatus.CANCEL },
        { runValidators: true, new: true, session },
      );

      // 2. 🔥 RELEASE SEATS
      await Seat.updateMany(
        { _id: { $in: booking.seats } },
        {
          status: SeatStatus.AVAILABLE,
          lockedBy: null,
          lockExpiresAt: null,
        },
        { session },
      );

      for (const seatId of booking.seats) {
        await redisClient.del(`seat_lock:${booking.event}:${seatId}`);
      }

      await session.commitTransaction();
      session.endSession();

      if (io) {
        io.to(booking.event.toString()).emit("seats-updated", {
          updaterId: "SYSTEM_PAYMENT_CANCEL",
          releasedSeatIds: booking.seats,
        });
      }

      return { success: false, message: "Payment Cancelled" };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  },

  getInvoiceDownloadUrl: async (paymentId: string, userId: Types.ObjectId) => {
    const payment =
      await Payment.findById(paymentId).select("invoiceUrl booking");
    // .orFail(new Error("Payment not found"));

    const booking = await Booking.findById(payment?.booking)
      .select("user")
      .orFail(new Error("Booking not found"));

    if (!payment) {
      throw new AppError(404, "Payment not found");
    }

    if (booking.user !== userId) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "This invoice does not belong to you. Access denied.",
      );
    }

    if (!payment.invoiceUrl) {
      throw new AppError(StatusCodes.NOT_FOUND, "No invoice found");
    }

    return payment.invoiceUrl;
  },
};
