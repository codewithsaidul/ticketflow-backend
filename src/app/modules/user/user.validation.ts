import { z } from "zod";
import { UserRole, UserStatus } from "./user.interface";

export const createUserZodSchema = z.object({
  name: z
    .string({ error: "Name must be a string" })
    .min(3, { message: "Name must be at least 3 characters long" })
    .max(50, { message: "Name cannot exceed 50 characters" }),

  email: z
    .string({ error: "Email must be a string" })
    .email({ message: "Invalid email address" }),

  password: z
    .string({ error: "Password must be a string" })
    .min(8, { message: "Password must be at least 8 characters long" }),
  // .regex(/^(?=.*[A-Z])/, "One uppercase letter required")
  // .regex(/^(?=.*[a-z])/, "One lowercase letter required")
  // .regex(/^(?=.*[!@#$%^&*])/, "One special char required")
  // .regex(/^(?=.*\d)/, "One number required"),
  bio: z.string().max(500).optional(),
  interests: z.array(z.string()).optional(),
  location: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  profileImg: z.string().optional(),
});

export const updateUserZodSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  profileImg: z.string().optional(),
  bio: z.string().max(500).optional(),
  interests: z.array(z.string()).optional(),
  location: z.string().optional(),
});
