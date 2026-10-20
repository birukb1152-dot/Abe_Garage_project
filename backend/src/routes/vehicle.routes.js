import express from 'express';
import { getVehicles,
         getVehiclesById
} from '../controllers/vehicle.controller.js';

const router = express.Router();

router.get('/', getVehicles);
router.get('/:id',getVehiclesById);

export default router;