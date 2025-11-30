import { Schema, model } from 'mongoose';
import { EventMode, EventModel, IEvent } from './events.interface';

const eventSchema = new Schema<IEvent, EventModel>({
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date, required: true },
  location: { type: String, required: true },
  
  // 🔥 Assignment Requirement: 'banner' এর বদলে 'image'
  image: { type: String, required: true }, 
  
  // 🔥 Search Filter এর জন্য ক্যাটাগরি
  category: { type: String, required: true },

  mode: { 
    type: String, 
    enum: Object.values(EventMode), // [...Object.values(...)] না দিলেও চলে
    default: EventMode.OPEN,
    required: true 
  },

  // 🔥 CRITICAL: কে ইভেন্ট বানাচ্ছে? (Host Role)
  organizer: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },

  // Travel Buddy / Activity Requirements
  minParticipants: { type: Number, default: 1 },
  maxParticipants: { type: Number },

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

// findOne এর জন্যও ডিলিট চেক করা ভালো
eventSchema.pre('findOne', function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

export const Event = model<IEvent, EventModel>('Event', eventSchema);