import express from 'express';
import { getServiceJobs,
         getServiceJob
 } from '../controllers/serviceJob.controller.js';

const router = express.Router();

router.get('/',getServiceJobs);
router.get('/:id',getServiceJob)

export default router;