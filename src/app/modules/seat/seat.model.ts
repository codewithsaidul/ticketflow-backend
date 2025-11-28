import { Schema, model } from 'mongoose';
import { ISeat, SeatModel } from './seat.interface';

const seatSchema = new Schema<ISeat, SeatModel>({
  event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  row: { type: String, required: true },
  number: { type: Number, required: true },
  label: { type: String, required: true }, // Frontend e show korar jonno
  price: { type: Number, required: true },
  
  status: { 
    type: String, 
    enum: ['AVAILABLE', 'LOCKED', 'BOOKED'], 
    default: 'AVAILABLE' 
  },

  lockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  lockExpiresAt: { type: Date }

}, {
  timestamps: true,
  versionKey: false
});

// 🔥 Compound Index (Most Important Line)
// একই ইভেন্টে যেন ভুল করেও ২টা "A1" সিট তৈরি না হয়
seatSchema.index({ event: 1, label: 1 }, { unique: true });

export const Seat = model<ISeat, SeatModel>('Seat', seatSchema);