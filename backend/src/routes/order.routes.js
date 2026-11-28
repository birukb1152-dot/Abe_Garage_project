import express from "express";

import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
} from "../controllers/order.controller.js";

import authenticate from "../middleware/auth.middleware.js";
import authorizeRoles from "../middleware/role.middleware.js";

const router = express.Router();

// Only administrators and receptionists can manage orders
router.use(authenticate, authorizeRoles("admin", "receptionist"));

router.post("/", createOrder);
router.get("/", getOrders);
router.get("/:id", getOrderById);
router.put("/:id", updateOrder);
router.patch("/:id/status", updateOrderStatus);

export default router;
