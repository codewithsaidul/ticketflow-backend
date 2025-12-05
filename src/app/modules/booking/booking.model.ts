import { Schema, model } from "mongoose";
import { BookingModel, BookingStatus, IBooking } from "./booking.interface";

const bookingSchema = new Schema<IBooking, BookingModel>(
  {
    event: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    payment: { type: Schema.Types.ObjectId, ref: "Payment" },

    seats: [{ type: Schema.Types.ObjectId, ref: "Seat", required: true }],

    totalAmount: { type: Number, required: true },

    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.PENDING,
    },
    transactionId: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

bookingSchema.pre("find", function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

bookingSchema.pre("findOne", function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

export const Booking = model<IBooking, BookingModel>("Booking", bookingSchema);
