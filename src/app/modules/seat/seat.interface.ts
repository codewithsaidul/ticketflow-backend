import { Model, Types } from 'mongoose';

export type TSeatStatus = 'AVAILABLE' | 'LOCKED' | 'BOOKED';

export interface ISeat {
  event: Types.ObjectId; // Reference to Event
  row: string;           // "A", "B"
  number: number;        // 1, 2
  label: string;         // "A1", "B5"
  price: number;
  status: TSeatStatus;
  
  // Locking Mechanism
  lockedBy?: Types.ObjectId; // User ID
  lockExpiresAt?: Date;      // 5 mins expiry
}

export type SeatModel = Model<ISeat>;