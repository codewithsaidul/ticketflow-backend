import { StatusCodes } from "http-status-codes";
import { envVars } from "../config/env";
import { AppError } from "../errorHelpers/AppError";
import { generateToken } from "./jwt";
import jwt, { JwtPayload } from "jsonwebtoken";
import { IUser, UserStatus } from "../modules/user/user.interface";
import { User } from "../modules/user/user.model";



export const createUserToken = (user: Partial<IUser>) => {
  const jwtPayload = {
    userId: user._id,
    email: user.email,
    role: user.role,
  };

  // genrate access tokens
  const accessToken = generateToken(
    jwtPayload,
    envVars.JWT.JWT_ACCESS_SECRET,
    envVars.JWT.JWT_ACCESS_EXPIRATION_TIME
  );

  // genrate  refresh tokens
  const refreshToken = generateToken(
    jwtPayload,
    envVars.JWT.JWT_REFRESH_SECRET,
    envVars.JWT.JWT_REFRESH_EXPIRATION_TIME
  );

  return {
    accessToken,
    refreshToken,
  };
};


export const createAccessTokenWithRefreshToken = async (
  refreshToken: string
) => {
  // verify the refresh token
  const verifyrefreshToken = jwt.verify(
    refreshToken,
    envVars.JWT.JWT_REFRESH_SECRET
  ) as JwtPayload;

  const isUserExist = await User.findOne({ email: verifyrefreshToken.email });

  // if user does not exist
  if (!isUserExist) {
    throw new AppError(StatusCodes.NOT_FOUND, "user does not exist");
  }

  // check if user is InActive or Blocked
  if (isUserExist.status === UserStatus.BLOCKED) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      `User is ${isUserExist.status}, please contact our support team.`
    );
  }

  // check if user  Deleted
  if (isUserExist.isDeleted) {
    throw new AppError(StatusCodes.FORBIDDEN, "User is deleted.");
  }


  
  // create jwt payload
  const jwtPayload = {
    userId: isUserExist._id,
    email: isUserExist.email,
    role: isUserExist.role,
  };

  // genrate access tokens
  const accessToken = generateToken(
    jwtPayload,
    envVars.JWT.JWT_ACCESS_SECRET,
    envVars.JWT.JWT_ACCESS_EXPIRATION_TIME
  );

  return accessToken;
};
