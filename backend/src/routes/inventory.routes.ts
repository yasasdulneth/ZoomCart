import { Router } from 'express';
import { deductStock, inventoryList, lowStock, updateStock, updateThreshold } from '../controllers/inventory.controller';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireDb } from '../middleware/requireDb.middleware';

export const inventoryRoutes = Router();

// User-facing: deduct stock after a successful payment
inventoryRoutes.post('/deduct', requireDb, authMiddleware, deductStock);

// Admin-only routes
inventoryRoutes.get('/', requireDb, adminAuthMiddleware, inventoryList);
inventoryRoutes.get('/low-stock', requireDb, adminAuthMiddleware, lowStock);
inventoryRoutes.put('/:productId/stock', requireDb, adminAuthMiddleware, updateStock);
inventoryRoutes.put('/:productId/threshold', requireDb, adminAuthMiddleware, updateThreshold);

