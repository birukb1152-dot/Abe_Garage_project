import express from 'express';
import { getVehicles,
         getVehicleById,
         createVehiles,
         updateVehicle,
         deleteVehicle
} from '../controllers/vehicle.controller.js';

import authenticate from '../middleware/auth.middleware.js';
import authorizeRoles from '../middleware/role.middleware.js';

const router = express.Router();

router.use(authenticate, authorizeRoles("admin", "receptionist"));

router.get('/', getVehicles);
router.get('/:id',getVehicleById);
router.post('/',createVehiles);
router.put('/:id',updateVehicle);
router.delete('/:id',deleteVehicle);

export default router;