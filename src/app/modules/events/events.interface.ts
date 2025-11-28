import { Model } from "mongoose";

export type TEventMode = "ASSIGNED" | "OPEN" | "STANDING";

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
  banner?: string;
  mode: TEventMode;

  // Conditional Fields
  seatLayout?: ISeatLayout; // Only for ASSIGNED
  zones?: IZone[]; // Only for OPEN/STANDING

  isActive: boolean;
  isDeleted: boolean;
}

export type EventModel = Model<IEvent>;
