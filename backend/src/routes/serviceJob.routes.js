import express from 'express';
import { getServiceJobs,
         getServiceJob,
         createServiceJob,
         updateServiceJob,
         deleteServiceJob
 } from '../controllers/serviceJob.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorizeRoles from '../middleware/role.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  authorizeRoles('admin', 'receptionist', 'mechanic'),
  getServiceJobs,
);
router.get(
  "/:id",
  authorizeRoles('admin', 'receptionist', 'mechanic'),
  getServiceJob,
);
router.post("/", authorizeRoles("admin", "receptionist"), createServiceJob);
router.put(
  "/:id",
  authorizeRoles('admin', 'mechanic'),
  updateServiceJob,
);
router.delete("/:id", authorizeRoles("admin"), deleteServiceJob);

export default router;