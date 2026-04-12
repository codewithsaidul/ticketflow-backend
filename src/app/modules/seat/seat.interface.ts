import { Model, Types } from 'mongoose';
import { Seat } from './seat.model';

export enum SeatStatus {
  AVAILABLE = "available",
  LOCKED = "locked",
  BOOKED = "booked" 
}

export interface ISeat {
  event: Types.ObjectId; // Reference to Event
  row: string;           // "A", "B"
  number: number;        // 1, 2
  label: string;         // "A1", "B5"
  price: number;
  status: SeatStatus;
  
  // Locking Mechanism
  lockedBy?: Types.ObjectId; // User ID
  lockExpiresAt?: Date;      // 5 mins expiry
}



export interface SeatActionPayload {
  eventId: string;
  seatId: string;
  userId: string;
}

export interface SeatErrorPayload {
  seatId: string;
  message?: string;
}

export interface SeatsUpdatedPayload {
  seatId: string;
  userId: string;
}




export interface ISeatWithLock extends ReturnType<(typeof Seat)["prototype"]["toObject"]> {
  status: SeatStatus;
  lockedBy: string | null;
}

interface ISeatMeta {
  totalRows?: number;
  totalCols?: number;
  basePrice?: number;
}

export interface ISeatResponse {
  data: ISeatWithLock[];
  meta: ISeatMeta;
}

export interface ISyncResult {
  locked: string[];
  unlocked: string[];
  failed: string[];
}

export type SeatModel = Model<ISeat>;