import express from 'express';
import { getServiceJobs,
         getServiceJob,
         createServiceJob,
         updateServiceJob,
         deleteServiceJob
 } from '../controllers/serviceJob.controller.js';

const router = express.Router();

router.get('/',getServiceJobs);
router.get('/:id',getServiceJob);
router.post('/',createServiceJob);
router.put('/:id',updateServiceJob);
router.delete('/:id',deleteServiceJob);

export default router;