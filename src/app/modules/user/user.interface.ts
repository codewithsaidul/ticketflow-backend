import { Model } from "mongoose";

export enum UserRole {
  SUPERADMIN = "superadmin",
  ADMIN = "admin",
  HOST = "host",
  USER = "user"
}

export enum UserStatus {
  PENDING = "pending",
  BLOCKED = "blocked",
  ACTIVE = "active"
}

export interface IAuthProvider {
  provider: "google" | "credentials";
  providerId: string;
}

export interface IUser {
  _id?: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  bio: string;
  interests: string[];
  location: string;
  role?: UserRole;
  status?: UserStatus;
  
  // Google Specific Fields
  providers?: IAuthProvider[]; // কেমনে লগইন করল?
  profileImg?: string;     // গুগল থেকে পাওয়া ছবি
  

  isPasswordResetTokenUsed?: boolean;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserModel extends Model<IUser> {
  isUserExistsByEmail(email: string): Promise<IUser | null>;
  isPasswordMatched(plainTextPassword: string, hashedPassword: string): Promise<boolean>;
}