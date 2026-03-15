import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { connectDB, getLastDbError } from '../config/db';

export async function requireDb(_req: Request, res: Response, next: NextFunction) {
  // 1 = connected
  if ((mongoose.connection.readyState as number) === 1) return next();

  // Try to connect once before returning 503 (helps when DB reconnects).
  try {
    await Promise.race([
      connectDB(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB connect timeout')), 2500)),
    ]);
    if ((mongoose.connection.readyState as number) === 1) return next();
  } catch {
    // ignore, we return 503 below
  }

  if (env.allowNoDb && env.nodeEnv !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(
      '[db] Database unavailable while ALLOW_NO_DB=true. If using Atlas, whitelist your IP or use a local MongoDB.'
    );
  }

  const detail = env.nodeEnv !== 'production' ? getLastDbError() : null;
  return res.status(503).json({ message: 'Database unavailable', detail });
}
