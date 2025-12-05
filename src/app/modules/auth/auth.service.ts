import bcrypt from "bcryptjs";
import { StatusCodes } from "http-status-codes";
import jwt, { JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";
import { envVars } from "../../config/env";
import { AppError } from "../../errorHelpers/AppError";
import { sendEmail } from "../../utils/sendEmail";
import {
  createAccessTokenWithRefreshToken,
  createUserToken,
} from "../../utils/userToken";
import { IUser, UserStatus } from "../user/user.interface";
import { User } from "../user/user.model";

const isProd = envVars.NODE_ENV === "production";

export const AuthServices = {
  createUser: async (payload: Partial<IUser>) => {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const isUserExist = await User.findOne({ email: payload.email });
      if (isUserExist) {
        throw new AppError(
          StatusCodes.CONFLICT,
          "User already exists with this email"
        );
      }

      const userData: Partial<IUser> = {
        ...payload,
        status: UserStatus.ACTIVE,
        providers: [
          {
            provider: "credentials",
            providerId: payload.email as string,
          },
        ],
      };

      const newUser = await User.create([userData], { session });

      if (!newUser.length) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Failed to create user");
      }

      const createdUser = newUser[0];

      // Token Generation
      const verificationToken = jwt.sign(
        { email: createdUser.email, id: createdUser._id },
        envVars.JWT.JWT_ACCESS_SECRET as string,
        { expiresIn: "10m" }
      );

      const verificationLink = `${
        isProd ? envVars.FRONTEND_URL : envVars.LOCAL_FRONTEND_URL
      }/auth/verify-email?token=${verificationToken}`;

      // Email Send
      await sendEmail({
        to: createdUser.email,
        subject: "Welcome to TicketFlow - Verify your email",
        templateName: "emailVerification",
        templateData: {
          name: createdUser.name,
          verificationLink,
        },
      });

      await session.commitTransaction();
      session.endSession();

      const result = createdUser.toObject();
      delete result.password;

      return result;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  },

  verifyUser: async (token: string) => {
    if (!token) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Verification token missing");
    }

    const decoded = jwt.verify(
      token,
      envVars.JWT.JWT_ACCESS_SECRET as string
    ) as JwtPayload;

    const user = await User.findOne({ email: decoded.email });
    if (!user) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }

    if (user.status === UserStatus.ACTIVE) {
      return "Email is already verified";
    }

    user.status = UserStatus.ACTIVE;
    await user.save();

    return "Email verified successfully!";
  },

  credentialsLogin: async (payload: Partial<IUser>) => {
    const { email, password } = payload;

    const isUserExist = await User.findOne({ email });

    if (!isUserExist) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }

    const isPasswordMatch = await bcrypt.compare(
      password as string,
      isUserExist?.password as string
    );

    if (!isPasswordMatch) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "Incorrect password");
    }

    const { accessToken, refreshToken } = createUserToken(isUserExist);

    return {
      accessToken,
      refreshToken,
      user: {
        _id: isUserExist._id,
        name: isUserExist.name,
        email: isUserExist.email,
        profilePicture: isUserExist.profileImg,
        role: isUserExist.role,
      },
    };
  },

  getMe: async (userId: string, role: string) => {
    // ১. ইউজারকে খুঁজে বের করা
    const user = await User.findById(userId);

    if (!user) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found!");
    }

    if (user.role !== role) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "Role mismatch!");
    }

    return user;
  },

  getNewAccessToken: async (refreshToken: string) => {
    // Logic to verify the refresh token and generate a new access token
    if (!refreshToken) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "You haven't any refresh token"
      );
    }

    const newAccessToken = await createAccessTokenWithRefreshToken(
      refreshToken
    );
    return {
      accessToken: newAccessToken,
    };
  },

  changePassword: async (
    userId: string,
    oldPassword: string,
    newPassword: string
  ) => {
    const isUserExist = await User.findById(userId);

    if (!isUserExist) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }

    if (!isUserExist.password) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "You haven't set a password yet. Please set a password first."
      );
    }

    if (isUserExist._id.toString() !== userId) {
      throw new AppError(
        StatusCodes.UNAUTHORIZED,
        "You are not authorized to change this password"
      );
    }

    const isOldPasswordMatch = await bcrypt.compare(
      oldPassword,
      isUserExist.password as string
    );

    if (!isOldPasswordMatch) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "Old password is incorrect");
    }

    isUserExist.password = await bcrypt.hash(
      newPassword,
      Number(envVars.BCRYPT_SALT_ROUND)
    );

    await isUserExist.save();

    return true;
  },

  setPassword: async (userId: string, planPassword: string) => {
    const isUserExist = await User.findById(userId);

    if (!isUserExist) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }

    if (
      isUserExist.password &&
      isUserExist.providers?.some((auth) => auth.provider === "google")
    ) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "You have already set a password for your account. Please use the existing password or reset it."
      );
    }

    isUserExist.password = await bcrypt.hash(
      planPassword,
      Number(envVars.BCRYPT_SALT_ROUND)
    );

    await isUserExist.save();

    return true;
  },

  forgotPassword: async (email: string) => {
    const isUserExist = await User.findOne({ email });

    if (!isUserExist) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }

    if (isUserExist.status === UserStatus.PENDING) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "You are not verified user. Please verified your email first"
      );
    }

    // check if user is InActive or Blocked
    if (isUserExist.status === UserStatus.BLOCKED) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        `Your account is currently ${isUserExist.status}, please contact our support team.`
      );
    }

    // check if user  Deleted
    if (isUserExist.isDeleted) {
      throw new AppError(StatusCodes.FORBIDDEN, "User is deleted.");
    }

    const jwtPayload = {
      userId: isUserExist._id,
      email: isUserExist.email,
      role: isUserExist.role,
    };

    const resetToken = jwt.sign(jwtPayload, envVars.JWT.JWT_ACCESS_SECRET, {
      expiresIn: "10m",
    });

    const resetUILink = `${envVars.FRONTEND_URL}/reset-password?id=${isUserExist._id}&token=${resetToken}`;

    isUserExist.isPasswordResetTokenUsed = false;

    sendEmail({
      to: isUserExist.email,
      subject: "Passwort Reset",
      templateName: "forgotPassword",
      templateData: {
        name: isUserExist.name,
        resetUILink,
      },
    });

    await isUserExist.save();
  },

  resetPassword: async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: Record<string, any>,
    decodedToken: JwtPayload
  ) => {
    if (payload.id !== decodedToken.userId) {
      throw new AppError(
        StatusCodes.UNAUTHORIZED,
        "You are not authorized to reset this password"
      );
    }

    const isUserExist = await User.findById(decodedToken.userId);

    if (!isUserExist) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }

    // checking resetToken alreayd used
    if (isUserExist.isPasswordResetTokenUsed) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "This token already has been used"
      );
    }

    isUserExist.password = await bcrypt.hash(
      payload.password,
      Number(envVars.BCRYPT_SALT_ROUND)
    );

    isUserExist.isPasswordResetTokenUsed = true;

    await isUserExist.save();

    return true;
  },
};
