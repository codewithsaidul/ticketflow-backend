import { model, Schema } from "mongoose";
import { IUser } from "./user.interface";


const userSchema = new Schema<IUser>({
  // define schema fields
});

export const User = model<IUser>("User", userSchema);
