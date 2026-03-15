import { Router } from 'express';
import { getPaymentById, listPayments, verifyPayment, deletePayment } from '../controllers/payment.controller';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';
import { requireDb } from '../middleware/requireDb.middleware';
import { restrictTo } from '../middleware/role.middleware';

export const adminPaymentRoutes = Router();

adminPaymentRoutes.use(requireDb, adminAuthMiddleware, restrictTo('SUPER_ADMIN'));
adminPaymentRoutes.get('/', listPayments);
adminPaymentRoutes.get('/:id', getPaymentById);
adminPaymentRoutes.put('/:id/verify', verifyPayment);
adminPaymentRoutes.delete('/:id', deletePayment);

