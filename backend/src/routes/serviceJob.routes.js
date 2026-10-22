import express from 'express';
import { getServiceJobs,
         getServiceJob,
         createServiceJob,
         updateServiceJob
 } from '../controllers/serviceJob.controller.js';

const router = express.Router();

router.get('/',getServiceJobs);
router.get('/:id',getServiceJob);
router.post('/',createServiceJob);
router.put('/:id',updateServiceJob);

export default router;