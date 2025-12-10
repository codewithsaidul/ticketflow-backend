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

export type BookingModel = Model<IBooking>;
