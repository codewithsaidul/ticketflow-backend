import { Model, Types } from "mongoose";

export enum EventMode {
  ASSIGNED = "ASSIGNED",
  OPEN = "OPEN",      
  STANDING = "STANDING"  
}


export enum EventStatus {
  ACTIVE = "active",
  PENDING = "pending",
  POSTPONED = "postponed",
  CANCELLED = "cancelled"
}

export interface ISeatLayout {
  rows: number;
  cols: number;
  matrix: number[][];
  basePrice: number;
}

export interface IZone {
  name: string; 
  capacity: number;
  price: number;
  sold: number;
}

export interface IEvent {
  title: string;
  description?: string;
  slug?: string;
  date: Date;
  location: string;
  image?: string;
  category: string;
  
  mode: EventMode;

  organizer: Types.ObjectId; 

  minParticipants?: number;
  maxParticipants?: number;

  seatLayout?: ISeatLayout; 
  zones?: IZone[]; 

  status: EventStatus;
  isDeleted: boolean;
}

export type EventModel = Model<IEvent>;