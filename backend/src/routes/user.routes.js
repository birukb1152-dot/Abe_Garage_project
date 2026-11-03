import express from "express";
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  resetUserPassword,
} from "../controllers/user.controller.js";
import authenticate from "../middleware/auth.middleware.js";
import authorizeRoles from "../middleware/role.middleware.js";

const router = express.Router();

router.use(authenticate,authorizeRoles("admin"));

router.post("/", createUser);
router.get("/", getUsers);
router.get("/:id",getUserById);
router.put("/:id",updateUser);
router.patch("/:id/status",updateUserStatus);
router.patch("/:id/password",resetUserPassword);

export default router;