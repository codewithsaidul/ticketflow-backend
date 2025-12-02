import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import {
  IAuthProvider,
  IUser,
  UserModel,
  UserRole,
  UserStatus,
} from "./user.interface";
import { envVars } from "../../config/env";

const authProviderSchema = new Schema<IAuthProvider>(
  {
    provider: { type: String, required: true },
    providerId: { type: String, required: true },
  },
  {
    versionKey: false,
    _id: false,
  }
);

const userSchema = new Schema<IUser, UserModel>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, select: 0 },
    phone: { type: String },
    bio: { type: String },
    interests: { type: [String], default: [] },
    location: { type: String },

    providers: [authProviderSchema],
    profileImg: { type: String },
    role: {
      type: String,
      enum: [...Object.values(UserRole)],
      default: UserRole.USER,
    },
    status: {
      type: String,
      enum: [...Object.values(UserStatus)],
      default: UserStatus.PENDING,
    },
    
    isPasswordResetTokenUsed: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);


userSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(
      this.password,
      Number(envVars.BCRYPT_SALT_ROUND)
    );
  }
  next();
});

userSchema.statics.isUserExistsByEmail = async function (email: string) {
  return await User.findOne({ email }).select("+password");
};

userSchema.statics.isPasswordMatched = async function (
  plainTextPassword,
  hashedPassword
) {
  if (!hashedPassword) return false;
  return await bcrypt.compare(plainTextPassword, hashedPassword);
};

export const User = model<IUser, UserModel>("User", userSchema);