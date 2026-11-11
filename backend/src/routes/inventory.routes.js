import express from "express";

import {
  getInventory,
  getInventoryById,
  createInventory,
  updateInventory,
  updateInventoryStock,
  deleteInventory,
} from "../controllers/inventory.controller.js";

import authenticate from "../middleware/auth.middleware.js";
import authorizeRoles from "../middleware/role.middleware.js";

const router = express.Router();

router.use(authenticate, authorizeRoles("admin", "receptionist"));

router.get("/", getInventory);

router.get("/:id", getInventoryById);

router.post("/", createInventory);

router.put("/:id", updateInventory);

router.patch("/:id/stock", updateInventoryStock);

router.delete("/:id", authorizeRoles("admin"), deleteInventory);

export default router;
