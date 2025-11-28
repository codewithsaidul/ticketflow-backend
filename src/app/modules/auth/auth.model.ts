import { Schema } from "mongoose";

const authSchema = new Schema ({
  // define schema fields
});

export const AuthModel = model("Auth", authSchema);
