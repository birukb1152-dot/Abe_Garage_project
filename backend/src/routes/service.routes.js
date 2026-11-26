import express from "express";

import {
  createService,
  getServices,
  getServiceById,
  updateService,
  updateServiceStatus,
} from "../controllers/service.controller.js";

import authenticate from "../middleware/auth.middleware.js";
import authorizeRoles from "../middleware/role.middleware.js";

const router = express.Router();

// Only administrators can manage the services catalogue
router.use(authenticate, authorizeRoles("admin"));

router.post("/", createService);
router.get("/", getServices);
router.get("/:id", getServiceById);
router.put("/:id", updateService);
router.patch("/:id/status", updateServiceStatus);

export default router;
