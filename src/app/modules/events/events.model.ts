import { Schema, model } from 'mongoose';
import { EventMode, EventModel, IEvent } from './events.interface';

const eventSchema = new Schema<IEvent, EventModel>({
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date, required: true },
  location: { type: String, required: true },
  banner: { type: String },
  
  mode: { 
    type: String, 
    enum: [...Object.values(EventMode)],
    default: EventMode.OPEN,
    required: true 
  },

  // For Cinema/Theater (Seat Map)
  seatLayout: {
    rows: { type: Number },
    cols: { type: Number },
    matrix: [[Number]], 
    basePrice: { type: Number }
  },

  // For Concert/Seminar (No Seat Map)
  zones: [{
    name: { type: String },
    capacity: { type: Number },
    price: { type: Number },
    sold: { type: Number, default: 0 }
  }],

  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
}, {
  timestamps: true,
});

// Query Middleware to hide deleted events
eventSchema.pre('find', function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

export const Event = model<IEvent, EventModel>('Event', eventSchema);