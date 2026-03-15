import { Router } from 'express';
import { getProductByBarcodePublic } from '../controllers/productPublic.controller';

export const productRoutes = Router();

// Public client endpoint for scanning flow
productRoutes.get('/barcode/:barcode', getProductByBarcodePublic);

