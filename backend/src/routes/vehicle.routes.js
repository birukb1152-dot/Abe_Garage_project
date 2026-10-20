import express from 'express';
import { getVehicles,
         getVehicleById,
         createVehiles
} from '../controllers/vehicle.controller.js';

const router = express.Router();

router.get('/', getVehicles);
router.get('/:id',getVehicleById);
router.post('/',createVehiles);

export default router;