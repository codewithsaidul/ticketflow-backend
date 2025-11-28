import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errorHelpers/AppError";
import { QueryBuilder } from "../../utils/queryBuilder";
import { userSearchableFields } from "./user.constants";
import { IUser, UserRole, UserStatus } from "./user.interface";
import { User } from "./user.model";

export const UserService = {
  getAllUsers: async (query: Record<string, unknown>) => {
    const usersQueryBuilder = new QueryBuilder(
      User.find({ isDeleted: false }),
      query
    )
      .search(userSearchableFields)
      .filter()
      .sort()
      .paginate()
      .fields();

    const [data, meta] = await Promise.all([
      usersQueryBuilder
        .build()
        .select("-password -auths -isPasswordResetTokenUsed"),
      usersQueryBuilder.getMeta(),
    ]);

    return {
      data,
      meta,
    };
  },

  getUserProfile: async (userId: string) => {
    const user = await User.findById(userId);

    if (!user) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }
    if (user.isDeleted) {
      throw new AppError(StatusCodes.FORBIDDEN, "User is deleted");
    }
    if (user.status === UserStatus.BLOCKED) {
      throw new AppError(StatusCodes.FORBIDDEN, "User is blocked");
    }

    return user;
  },

  updateUserStatus: async (userId: string, status: UserStatus) => {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }

    user.status = status;
    await user.save();

    return user;
  },

  updateUserInfo: async (
    userId: string,
    payload: Partial<IUser>,
    currentUserRole: string
  ) => {
    if (
      currentUserRole !== UserRole.SUPERADMIN &&
      currentUserRole !== UserRole.ADMIN
    ) {
      if (payload.role || payload.status || payload.email) {
        throw new AppError(
          StatusCodes.FORBIDDEN,
          "You cannot update sensitive fields"
        );
      }
    }

    const result = await User.findByIdAndUpdate(userId, payload, {
      new: true,
      runValidators: true,
    });

    if (!result) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }

    return result;
  },

  deleteUser: async (userId: string) => {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }

    user.isDeleted = true;
    await user.save();

    return null;
  },
};
