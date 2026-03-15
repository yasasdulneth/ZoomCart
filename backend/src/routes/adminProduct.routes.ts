import { Router } from 'express';
import { createProduct, deleteProduct, getProductById, listProducts, updateProduct } from '../controllers/product.controller';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';
import { requireDb } from '../middleware/requireDb.middleware';

export const adminProductRoutes = Router();

adminProductRoutes.use(requireDb, adminAuthMiddleware);
adminProductRoutes.get('/', listProducts);
adminProductRoutes.get('/:id', getProductById);
adminProductRoutes.post('/', createProduct);
adminProductRoutes.put('/:id', updateProduct);
adminProductRoutes.delete('/:id', deleteProduct);

