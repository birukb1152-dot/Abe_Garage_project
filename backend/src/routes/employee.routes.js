import express from "express";

import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  updateEmployeeStatus,
} from "../controllers/employee.controller.js";

import authenticate from "../middleware/auth.middleware.js";
import authorizeRoles from "../middleware/role.middleware.js";

const router = express.Router();

// Only administrators can manage employee records
router.use(authenticate, authorizeRoles("admin"));

router.post("/", createEmployee);
router.get("/", getEmployees);
router.get("/:id", getEmployeeById);
router.put("/:id", updateEmployee);
router.patch("/:id/status", updateEmployeeStatus);

export default router;
