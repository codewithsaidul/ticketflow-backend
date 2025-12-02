import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { UserController } from "./user.controller";
import { UserRole } from "./user.interface";
import { updateUserZodSchema } from "./user.validation";

const router = Router();

router.get("/", checkAuth(UserRole.ADMIN, UserRole.SUPERADMIN), UserController.getAllUsers);
router.get(
  "/me",
  checkAuth(...Object.values(UserRole)),
  UserController.getUserProfile
);
router.patch(
  "/:userId/userStatus",
  checkAuth(UserRole.ADMIN, UserRole.SUPERADMIN),
  UserController.updateUserStatus
);
router.patch(
  "/:userId",
  checkAuth(...Object.values(UserRole)),
  validateRequest(updateUserZodSchema),
  UserController.updateUserInfo
);
router.delete("/:userId", checkAuth(UserRole.ADMIN, UserRole.SUPERADMIN), UserController.deleteUser);

export const UserRoutes = router;
