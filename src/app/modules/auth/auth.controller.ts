/* eslint-disable @typescript-eslint/no-unused-vars */
import { StatusCodes } from "http-status-codes";
import { JwtPayload } from "jsonwebtoken";
import passport from "passport";
import { envVars } from "../../config/env";
import { AppError } from "../../errorHelpers/AppError";
import { TNext, TRequest, TResponse } from "../../types/global";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { setAuthCookie } from "../../utils/setCookie";
import { createUserToken } from "../../utils/userToken";
import { AuthServices } from "./auth.service";
import { IUser } from "../user/user.interface";

export const AuthController = {
  createUser: catchAsync(async (req: TRequest, res: TResponse, next: TNext) => {
    const payload: IUser = {
      ...req.body,
      profileImg: req?.file?.path,
    };
    const user = await AuthServices.createUser(payload);

    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      // message: `A verification email has been sent to your email. Please check your inbox to verify your account.`,
      message: "Account created successfully",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profileImg: user.profileImg,
        role: user.role,
      },
    });
  }),

  verifyUser: catchAsync(async (req: TRequest, res: TResponse, next: TNext) => {
    const message = await AuthServices.verifyUser(req.query.token as string);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: message,
      data: null,
    });
  }),

  credentialsLogin: catchAsync(
    async (req: TRequest, res: TResponse, next: TNext) => {
      passport.authenticate(
        "local",
        { session: false },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err: any, user: any, info: any) => {
          if (err) {
            return next(new AppError(StatusCodes.BAD_REQUEST, err));
          }

          if (!user && info.message === "User not found") {
            return next(new AppError(StatusCodes.NOT_FOUND, info.message));
          }
          if (
            !user &&
            info.message ===
              "You're not verified yet, please verify your email first"
          ) {
            return next(new AppError(StatusCodes.UNAUTHORIZED, info.message));
          }
          if (!user && info.message === "Incorrect password") {
            return next(new AppError(StatusCodes.BAD_REQUEST, info.message));
          }

          if (!user) {
            return next(new AppError(StatusCodes.BAD_REQUEST, info.message));
          }

          const { accessToken, refreshToken } = createUserToken(user);

          setAuthCookie(res, { accessToken, refreshToken });

          sendResponse(res, {
            statusCode: StatusCodes.OK,
            success: true,
            message: "User logged in successfully",
            data: {
              accessToken,
              refreshToken,
              user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                profileImg: user.profileImg,
                role: user.role,
              },
            },
          });
        }
      )(req, res, next);
    }
  ),


  getMe: catchAsync(async (req: TRequest, res: TResponse, next: TNext) => {
  const { userId, role } = req.user as JwtPayload;

  const result = await AuthServices.getMe(userId, role);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User profile retrieved successfully",
    data: result,
  });
}),

  getNewAccessToken: catchAsync(
    async (req: TRequest, res: TResponse, next: TNext) => {
      const refreshToken = req?.cookies?.refreshToken;

      const tokenInfo = await AuthServices.getNewAccessToken(refreshToken);

      setAuthCookie(res, tokenInfo);

      sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "New access token generated successfully",
        data: tokenInfo,
      });
    }
  ),

  logout: catchAsync(async (req: TRequest, res: TResponse, next: TNext) => {
    res.clearCookie("accessToken", {
      httpOnly: true, // Safer from XSS
      secure: envVars.NODE_ENV === "production", // Only sends over HTTPS on production
      sameSite: "none",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true, // Safer from XSS
      secure: envVars.NODE_ENV === "production", // Only sends over HTTPS on production
      sameSite: "none",
    });

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "User Logged Out Successfully",
      data: null,
    });
  }),

  changePassword: catchAsync(
    async (req: TRequest, res: TResponse, next: TNext) => {
      const { oldPassword, newPassword } = req.body;
      const decodedToken = req.user as JwtPayload;

      await AuthServices.changePassword(
        decodedToken.userId,
        oldPassword,
        newPassword
      );

      sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Password changed successfully",
        data: null,
      });
    }
  ),

  setPassword: catchAsync(
    async (req: TRequest, res: TResponse, next: TNext) => {
      const { password } = req.body;

      const decodedToken = req.user as JwtPayload;

      await AuthServices.setPassword(decodedToken.userId, password);

      sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Password set successfully",
        data: null,
      });
    }
  ),

  forgotPassword: catchAsync(
    async (req: TRequest, res: TResponse, next: TNext) => {
      const { email } = req.body;

      const resetLink = await AuthServices.forgotPassword(email);

      sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Password reset link sent successfully",
        data: resetLink,
      });
    }
  ),

  resetPassword: catchAsync(
    async (req: TRequest, res: TResponse, next: TNext) => {
      const decodedToken = req.user as JwtPayload;

      await AuthServices.resetPassword(req.body, decodedToken);

      sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Password reset successfully",
        data: null,
      });
    }
  ),

  googleCallbackURL: catchAsync(
    async (req: TRequest, res: TResponse, next: TNext) => {
      let redirectTo = req.query.state ? (req.query.state as string) : "";

      const user = req.user;

      if (!user) {
        throw new AppError(StatusCodes.NOT_FOUND, "User not found");
      }

      if (redirectTo.startsWith("/")) {
        redirectTo = redirectTo.slice(1);
      }

      const tokenInfo = createUserToken(user);

      setAuthCookie(res, tokenInfo);

      return res.redirect(
        `${
          envVars.NODE_ENV !== "production"
            ? envVars.LOCAL_FRONTEND_URL
            : envVars.FRONTEND_URL
        }/${redirectTo}?token=${tokenInfo.accessToken}`
      );
    }
  ),
};
