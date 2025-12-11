import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth";
import { UserRole } from "../user/user.interface";
import { AdminController } from "./admin.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { createUserZodSchema } from "../user/user.validation";
import { multerUpload } from "../../config/multer.config";

const router = Router();

router.post(
  "/",
  checkAuth(UserRole.ADMIN, UserRole.SUPERADMIN),
  multerUpload.single("file"),
  validateRequest(createUserZodSchema),
  AdminController.createAdmin
);
router.get(
  "/",
  checkAuth(UserRole.ADMIN, UserRole.SUPERADMIN),
  AdminController.getAllAdmins
);

export const AdminRoutes = router;
