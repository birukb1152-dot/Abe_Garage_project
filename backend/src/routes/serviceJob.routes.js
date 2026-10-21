import express from 'express';
import { getServiceJobs } from '../controllers/serviceJob.controller.js';

const router = express.Router();

router.get('/',getServiceJobs);

export default router;