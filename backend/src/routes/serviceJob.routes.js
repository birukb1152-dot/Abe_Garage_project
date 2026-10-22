import express from 'express';
import { getServiceJobs,
         getServiceJob,
         createServiceJob
 } from '../controllers/serviceJob.controller.js';

const router = express.Router();

router.get('/',getServiceJobs);
router.get('/:id',getServiceJob);
router.post('/',createServiceJob);

export default router;