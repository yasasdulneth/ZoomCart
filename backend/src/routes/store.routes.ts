import { Router } from 'express';
import { getAisles, getProductLocation } from '../controllers/store.controller';
import { requireDb } from '../middleware/requireDb.middleware';

export const storeRoutes = Router();

storeRoutes.use(requireDb);
storeRoutes.get('/aisles', getAisles);
storeRoutes.get('/product-location', getProductLocation);
