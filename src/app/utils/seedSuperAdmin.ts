/* eslint-disable no-console */
import { envVars } from "../config/env";
import bcrypt from "bcryptjs";
import { User } from "../modules/user/user.model";
import { IAuthProvider, IUser, UserRole, UserStatus } from "../modules/user/user.interface";


export const seedSuperAdmin = async () => {
  try {
    const isSuperAdminExist = await User.findOne({ role: UserRole.SUPERADMIN });

    if (isSuperAdminExist) {
      console.log("Super Admin already exists.");
      return null;
    }

    const hashPassword = await bcrypt.hash(
      process.env.SUPER_ADMIN_PASSWORD as string,
      parseInt(envVars.BCRYPT_SALT_ROUND as string)
    );

    const authProvider: IAuthProvider = {
      provider: "credentials",
      providerId: envVars.SUPER_ADMIN_EMAIL,
    };


    const superAdminInfo: IUser = {
        name: "TicketFlow - Super Admin",
        email: envVars.SUPER_ADMIN_EMAIL,
        password: hashPassword,
        bio: "I am the super admin of TicketFlow.",
        interests: ["Management", "Technology", "Events"],
        location: "Headquarters",
        role: UserRole.SUPERADMIN,
        status: UserStatus.ACTIVE,
        providers: [authProvider],
        isDeleted: false,
    }


    await User.create(superAdminInfo);

    console.log("Super Admin seeded successfully.");

  } catch (error) {
    console.log(error);
  }
};
