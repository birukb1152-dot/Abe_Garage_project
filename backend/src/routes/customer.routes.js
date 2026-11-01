import express from 'express';
import {
    getCustomer,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer
} from '../controllers/customer.controller.js';

import authenticate from '../middleware/auth.middleware.js';
import authorizeRoles from '../middleware/role.middleware.js';

const router = express.Router();

router.use(authenticate, authorizeRoles("admin", "receptionist"));

router.get('/',getCustomer);

router.get('/:id',getCustomerById);

router.post('/',createCustomer);

router.put('/:id',updateCustomer);

router.delete('/:id',deleteCustomer);

export default router;