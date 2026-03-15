import { Router } from 'express';
import { changePassword, getProfile, updateProfile } from '../controllers/adminProfile.controller';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';
import { requireDb } from '../middleware/requireDb.middleware';

export const adminProfileRoutes = Router();

adminProfileRoutes.use(requireDb, adminAuthMiddleware);
adminProfileRoutes.get('/', getProfile);
adminProfileRoutes.put('/', updateProfile);
adminProfileRoutes.put('/change-password', changePassword);

