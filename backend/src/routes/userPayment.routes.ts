import { Router } from 'express';
import {
  completeZeroPayment,
  createPayment,
  getPaymentStatus,
  verifyStripePayment,
} from '../controllers/userPayment.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export const userPaymentRoutes = Router();

userPaymentRoutes.use(authMiddleware);
userPaymentRoutes.post('/create', createPayment);
userPaymentRoutes.get('/status/:id', getPaymentStatus);
userPaymentRoutes.post('/verify-stripe/:id', verifyStripePayment);
userPaymentRoutes.post('/complete-zero/:id', completeZeroPayment);
