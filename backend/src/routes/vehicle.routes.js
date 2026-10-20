import express from 'express';
import { getVehicles,
         getVehicleById
} from '../controllers/vehicle.controller.js';

const router = express.Router();

router.get('/', getVehicles);
router.get('/:id',getVehicleById);

export default router;