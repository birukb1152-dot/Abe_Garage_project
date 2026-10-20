import express from 'express';
import { getVehicles,
         getVehicleById,
         createVehiles,
         updateVehicle
} from '../controllers/vehicle.controller.js';

const router = express.Router();

router.get('/', getVehicles);
router.get('/:id',getVehicleById);
router.post('/',createVehiles);
router.put('/:id',updateVehicle);

export default router;