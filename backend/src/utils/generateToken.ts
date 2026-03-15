import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export function generateToken(payload: { userId: string; role: string }) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' });
}

