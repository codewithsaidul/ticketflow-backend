import { Model, Types } from "mongoose";

export enum BookingStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
  EXPIRED = "expired",
  FAILED = "failed",
}

export interface IBooking {
  _id?: string;
  event: Types.ObjectId;
  user: Types.ObjectId;
  payment: Types.ObjectId;
  seats: Types.ObjectId[];
  totalAmount: number;
  status: BookingStatus;
  transactionId?: string;
  isDeleted: boolean;
  createdAt?: string;
}

export interface IBookingMatchCondition {
  $or?: {
    event?: { $in: Types.ObjectId[] };
    user?: { $in: Types.ObjectId[] };
  }[];
  event: {
    $in: Types.ObjectId[];
  };
  user?: {
    $in: Types.ObjectId[];
  };
  isDeleted: false;
}

export type BookingModel = Model<IBooking>;
