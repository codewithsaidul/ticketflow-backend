import { Schema, model } from 'mongoose';
import { ISeat, SeatModel, SeatStatus } from './seat.interface';

const seatSchema = new Schema<ISeat, SeatModel>({
  event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  row: { type: String, required: true },
  number: { type: Number, required: true },
  label: { type: String, required: true },
  price: { type: Number, required: true },
  status: { 
    type: String, 
    enum: [...Object.values(SeatStatus)], 
    default: SeatStatus.AVAILABLE 
  },
  lockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  lockExpiresAt: { type: Date }

}, {
  timestamps: true,
  versionKey: false
});


seatSchema.index({ event: 1, label: 1 }, { unique: true });

export const Seat = model<ISeat, SeatModel>('Seat', seatSchema);