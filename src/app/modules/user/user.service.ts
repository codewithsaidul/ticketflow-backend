import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errorHelpers/AppError";
import { QueryBuilder } from "../../utils/queryBuilder";
import { userSearchableFields } from "./user.constants";
import { IUser, UserRole, UserStatus } from "./user.interface";
import { User } from "./user.model";

export const UserService = {
  getAllUsers: async (query: Record<string, unknown>) => {
    const usersQueryBuilder = new QueryBuilder(
      User.find({
        role: { $nin: [UserRole.ADMIN, UserRole.SUPERADMIN] },
        isDeleted: false,
      }),
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

  updateUserStatus: async (
    targetUserId: string,
    newStatus: UserStatus,
    updaterId: string,
    updaterRole: UserRole
  ) => {
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      throw new AppError(StatusCodes.NOT_FOUND, "Target user not found");
    }

    if (targetUserId === updaterId) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "You cannot modify your own status through this endpoint."
      );
    }

    const targetUserRole = targetUser.role as UserRole;

    if (targetUserRole === UserRole.SUPERADMIN) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Operation forbidden. Cannot modify the status of a Super Admin."
      );
    }

    if (targetUserRole === UserRole.ADMIN && updaterRole === UserRole.ADMIN) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "An Admin cannot modify the status of another Admin."
      );
    }

    targetUser.status = newStatus;
    await targetUser.save();

    return targetUser;
  },

  updateUserInfo: async (
    userId: string,
    payload: Partial<IUser>,
    currentUserRole: string
  ) => {
    const userToUpdate = await User.findById(userId);

    if (!userToUpdate) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }

    if (
      userToUpdate.role === UserRole.SUPERADMIN &&
      currentUserRole !== UserRole.SUPERADMIN
    ) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Access Denied! Only a Super Admin can modify Super Admin accounts."
      );
    }

    if (
      currentUserRole !== UserRole.SUPERADMIN &&
      currentUserRole !== UserRole.ADMIN
    ) {
      if (payload.role || payload.status || payload.email) {
        throw new AppError(
          StatusCodes.FORBIDDEN,
          "You cannot update sensitive fields (Role, Status, Email)"
        );
      }
    }

    const result = await User.findByIdAndUpdate(userId, payload, {
      new: true,
      runValidators: true,
    });

    return result;
  },

  deleteUser: async (userId: string, currentUserRole: string) => {
    const userToDelete = await User.findById(userId);

    if (!userToDelete) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }

    if (
      userToDelete.role === UserRole.SUPERADMIN &&
      currentUserRole !== UserRole.SUPERADMIN
    ) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Access Denied! Only a Super Admin can delete another Super Admin."
      );
    }

    if (userToDelete.role === UserRole.SUPERADMIN) {
      const activeSuperAdminCount = await User.countDocuments({
        role: UserRole.SUPERADMIN,
        isDeleted: false,
      });

      if (activeSuperAdminCount <= 1) {
        throw new AppError(
          StatusCodes.CONFLICT,
          "Operation Blocked! You cannot delete the only remaining Super Admin."
        );
      }
    }

    userToDelete.isDeleted = true;
    await userToDelete.save();

    return null;
  },
};
