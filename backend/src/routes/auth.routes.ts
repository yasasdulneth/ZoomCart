import { Router } from 'express';
import { addLoyaltyPoints, login, me, register } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export const authRoutes = Router();

authRoutes.post('/register', register);
authRoutes.post('/login', login);
authRoutes.get('/me', authMiddleware, me);
authRoutes.post('/loyalty/add', authMiddleware, addLoyaltyPoints);

