import express from 'express';
import { getVehicles,
         getVehicleById,
         createVehiles,
         updateVehicle,
         deleteVehicle
} from '../controllers/vehicle.controller.js';

const router = express.Router();

router.get('/', getVehicles);
router.get('/:id',getVehicleById);
router.post('/',createVehiles);
router.put('/:id',updateVehicle);
router.delete('/:id',deleteVehicle);

export default router;