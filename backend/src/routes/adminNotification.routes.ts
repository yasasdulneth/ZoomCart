import { Router } from 'express';
import {
  createNotification,
  deleteNotification,
  listAdminNotifications,
  markNotificationRead,
} from '../controllers/notification.controller';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';
import { requireDb } from '../middleware/requireDb.middleware';

export const adminNotificationRoutes = Router();

adminNotificationRoutes.use(requireDb, adminAuthMiddleware);
adminNotificationRoutes.get('/', listAdminNotifications);
adminNotificationRoutes.post('/', createNotification);
adminNotificationRoutes.put('/:id/read', markNotificationRead);
adminNotificationRoutes.delete('/:id', deleteNotification);

