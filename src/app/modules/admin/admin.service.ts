import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errorHelpers/AppError";
import { QueryBuilder } from "../../utils/queryBuilder";
import { userSearchableFields } from "../user/user.constants";
import { IUser, UserRole, UserStatus } from "../user/user.interface";
import { User } from "../user/user.model";

export const AdminService = {
  createAdmin: async (payload: IUser) => {
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

    const newAdmin = await User.create(userData);

    if (!newAdmin) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Failed to create admin");
    }

    const result = newAdmin.toObject();
    delete result.password;

    return result;
  },

  getAllAdmins: async (query: Record<string, string>) => {
    const usersQueryBuilder = new QueryBuilder(
      User.find({
        role: { $in: [UserRole.ADMIN, UserRole.SUPERADMIN] },
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
};
