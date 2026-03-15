import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env';
import { healthRoutes } from './routes/health.routes';
import { authRoutes } from './routes/auth.routes';
import { errorMiddleware } from './middleware/error.middleware';
import { requireDb } from './middleware/requireDb.middleware';
import { adminAuthRoutes } from './routes/adminAuth.routes';
import { employeeRoutes } from './routes/employee.routes';
import { adminProductRoutes } from './routes/adminProduct.routes';
import { inventoryRoutes } from './routes/inventory.routes';
import { adminPaymentRoutes } from './routes/adminPayment.routes';
import { adminNotificationRoutes } from './routes/adminNotification.routes';
import { adminProfileRoutes } from './routes/adminProfile.routes';
import { productRoutes } from './routes/product.routes';
import { storeRoutes } from './routes/store.routes';
import { userPaymentRoutes } from './routes/userPayment.routes';

export function createApp() {
  const app = express();

  app.use(
    cors({
      // In development allow all origins so the Expo Go mobile app can reach the backend
      // regardless of which network interface is active.
      origin: env.nodeEnv === 'production' ? [env.clientUrl, env.adminUrl] : true,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));

  app.use('/api', healthRoutes);
  app.use('/api/auth', requireDb, authRoutes);
  app.use('/api/products', requireDb, productRoutes);
  app.use('/api/payments', requireDb, userPaymentRoutes);
  app.use('/api/store', storeRoutes);
  // User-facing inventory endpoint (deduct stock after purchase)
  app.use('/api/inventory', inventoryRoutes);

  // Admin-side API (shared backend)
  app.use('/api/admin/auth', adminAuthRoutes);
  app.use('/api/admin/employees', employeeRoutes);
  app.use('/api/admin/products', adminProductRoutes);
  app.use('/api/admin/inventory', inventoryRoutes);
  app.use('/api/admin/payments', adminPaymentRoutes);
  app.use('/api/admin/notifications', adminNotificationRoutes);
  app.use('/api/admin/profile', adminProfileRoutes);

  app.use(errorMiddleware);
  return app;
}

