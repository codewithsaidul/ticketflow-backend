import bcrypt from "bcryptjs";
import { StatusCodes } from "http-status-codes";
import jwt, { JwtPayload } from "jsonwebtoken";
import { envVars } from "../../config/env";
import { AppError } from "../../errorHelpers/AppError";
import { sendEmail } from "../../utils/sendEmail";
import {
  createAccessTokenWithRefreshToken,
  createUserToken,
} from "../../utils/userToken";
import { IUser, UserStatus } from "../user/user.interface";
import { User } from "../user/user.model";

export const AuthServices = {
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

  // This function handles changing the user's password.
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

  // This function handles setting a new password for the user.
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

  // This function handles the forgot password process.
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

  // This function handles resetting the user's password.
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
