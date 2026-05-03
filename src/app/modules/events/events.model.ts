import { Schema, model } from "mongoose";
import {
  EventMode,
  EventModel,
  EventStatus,
  GateAssignmentStrategy,
  IEvent,
  ISeatLayout,
  IZone,
} from "./events.interface";

const seatLayoutSchema = new Schema<ISeatLayout>(
  {
    rows: { type: Number },
    cols: { type: Number },
    matrix: [[Number]],
    basePrice: { type: Number },
  },
  { _id: false, versionKey: false },
);
const zonesSchema = new Schema<IZone>(
  {
    name: { type: String },
    capacity: { type: Number },
    price: { type: Number },
    sold: { type: Number, default: 0 },
    reserved: { type: Number },
    gates: [{ type: String }],
    gateAssignmentStrategy: {
      type: String,
      enum: Object.values(GateAssignmentStrategy),
      default: GateAssignmentStrategy.SEQUENTIAL,
    },
  },
  { _id: false, versionKey: false },
);

const eventSchema = new Schema<IEvent, EventModel>(
  {
    title: { type: String, required: true },
    description: { type: String },
    slug: { type: String },
    date: { type: Date, required: true },
    location: { type: String, required: true },
    image: { type: String },
    category: { type: String, required: true },
    mode: {
      type: String,
      enum: Object.values(EventMode),
      default: EventMode.ASSIGNED,
      required: true,
    },
    organizer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    minParticipants: { type: Number, default: 1 },
    maxParticipants: { type: Number },
    seatLayout: seatLayoutSchema,
    zones: [zonesSchema],

    status: {
      type: String,
      enum: Object.values(EventStatus),
      default: EventStatus.ACTIVE,
    },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

eventSchema.pre("find", function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

eventSchema.pre("findOne", function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

export const Event = model<IEvent, EventModel>("Event", eventSchema);
