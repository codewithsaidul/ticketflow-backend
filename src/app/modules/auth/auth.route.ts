import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AuthController } from "./auth.controller";
import passport from "passport";
import { TNext, TRequest, TResponse } from "../../types/global";
import { envVars } from "../../config/env";
import {
  changePasswordZodSchema,
  setPasswordZodSchema,
} from "./auth.validation";
import { UserRole } from "../user/user.interface";
import { createUserZodSchema } from "../user/user.validation";
import { multerUpload } from "../../config/multer.config";

const router = Router();

router.post(
  "/register",
  multerUpload.single("file"),
  validateRequest(createUserZodSchema),
  AuthController.createUser
);
router.post("/login", AuthController.credentialsLogin);
router.post("/refresh-token", AuthController.getNewAccessToken);
router.post("/logout", AuthController.logout);
router.post(
  "/change-password",
  checkAuth(...Object.values(UserRole)),
  validateRequest(changePasswordZodSchema),
  AuthController.changePassword
);
router.post(
  "/set-password",
  checkAuth(...Object.values(UserRole)),
  validateRequest(setPasswordZodSchema),
  AuthController.setPassword
);
router.post("/reset-password", AuthController.resetPassword);
router.post("/forgot-password", AuthController.forgotPassword);

router.get(
  "/me",
  checkAuth(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.HOST, UserRole.USER),
  AuthController.getMe
);

router.get("/verify-email", AuthController.verifyUser);

router.get("/google", async (req: TRequest, res: TResponse, next: TNext) => {
  const redirect = req.query.redirect || "/";
  passport.authenticate("google", {
    scope: ["profile", "email"],
    state: redirect as string,
    prompt: "select_account",
  })(req, res, next);
});

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${envVars.FRONTEND_URL}/login?error=There are some issues with your account. Please contact with our support team`,
  }),
  AuthController.googleCallbackURL
);

export const AuthRoutes = router;
