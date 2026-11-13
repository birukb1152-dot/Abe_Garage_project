import express from "express";

import {
  issuePartsToServiceJob,
  getPartsUsedOnServiceJob,
  returnPartsFromServiceJob,
} from "../controllers/serviceJobParts.controller.js";

import authenticate from "../middleware/auth.middleware.js";
import authorizeRoles from "../middleware/role.middleware.js";

const router = express.Router();

router.use(authenticate);

router.post(
    "/",authorizeRoles("admin", "receptionist", "mechanic"),
    issuePartsToServiceJob
);

router.get("/job/:jobId",
    authorizeRoles("admin", "receptionist", "mechanic"),
    getPartsUsedOnServiceJob
);

router.post("/:id/return",
    authorizeRoles("admin", "receptionist"),
    returnPartsFromServiceJob
);

export default router;