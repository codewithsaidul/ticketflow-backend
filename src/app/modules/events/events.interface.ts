import { Model, Types } from "mongoose";

export enum EventMode {
  ASSIGNED = "ASSIGNED", // e.g., Cinema, Theater (Matrix Layout)
  OPEN = "OPEN",         // e.g., Concert (General Entry)
  STANDING = "STANDING"  // e.g., Seminar (Zones)
}

export interface ISeatLayout {
  rows: number;
  cols: number;
  matrix: number[][]; // [1,1,0,1] - 1=Seat, 0=Gap
  basePrice: number;
}

export interface IZone {
  name: string; // e.g., "VIP", "Gallery"
  capacity: number;
  price: number;
  sold: number;
}

export interface IEvent {
  title: string;
  description?: string;
  date: Date;
  location: string;
  image?: string; // 'banner' -> 'image' (অ্যাসাইনমেন্ট অনুযায়ী)
  category: string; // e.g., "Music", "Tech", "Travel"
  
  mode: EventMode;

  // 🔥 Critical for Host Role: কে ইভেন্টটা হোস্ট করছে?
  organizer: Types.ObjectId; 

  // Assignment Specifics (Travel Buddy লজিক)
  minParticipants?: number;
  maxParticipants?: number;

  // Conditional Fields (The Core Engine)
  seatLayout?: ISeatLayout; // Only for ASSIGNED
  zones?: IZone[];          // Only for OPEN/STANDING

  isActive: boolean;
  isDeleted: boolean;
}

export type EventModel = Model<IEvent>;