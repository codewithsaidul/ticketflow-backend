/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from "mongoose";

export enum PaymentStatus {
  UNPAID = "unpaid",
  PAID = "paid",
  FAILED = "failed",
  CANCEL = "cancel",
}

export interface IPayment {
  booking: Types.ObjectId;
  transactionId: string;
  amount: number;
  paymentGateWayData?: any;
  invoiceNumber?: number;
  invoiceUrl?: string;
  status: PaymentStatus;
}
