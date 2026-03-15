import { Router } from 'express';
import { bootstrapSuperAdmin, loginAdmin, logoutAdmin, meAdmin, registerAdmin } from '../controllers/adminAuth.controller';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';
import { requireDb } from '../middleware/requireDb.middleware';

export const adminAuthRoutes = Router();

// Create the very first SUPER_ADMIN via website (one-time, secret protected)
adminAuthRoutes.post('/bootstrap', requireDb, bootstrapSuperAdmin);

adminAuthRoutes.post('/login', requireDb, loginAdmin);
adminAuthRoutes.get('/me', requireDb, adminAuthMiddleware, meAdmin);
adminAuthRoutes.post('/logout', requireDb, adminAuthMiddleware, logoutAdmin);

// Only SUPER_ADMIN can create admins/employees
// Public registration: creates STAFF accounts only (SUPER_ADMIN via /bootstrap)
adminAuthRoutes.post('/register', requireDb, registerAdmin);

