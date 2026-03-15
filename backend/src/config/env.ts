import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`[env] Missing required environment variable: ${name}`);
  }
  return v;
}

export const env = {
  nodeEnv: (process.env.NODE_ENV ?? 'development') as string,
  allowNoDb: String(process.env.ALLOW_NO_DB ?? 'false').toLowerCase() === 'true',

  port: Number(requireEnv('PORT')),

  // Prefer MONGO_URI going forward; keep backward-compat with MONGODB_URI.
  mongoUri: process.env.MONGO_URI ?? requireEnv('MONGODB_URI'),
  mongoUriFallback: process.env.MONGO_URI_FALLBACK?.trim() || process.env.MONGODB_URI_FALLBACK?.trim() || undefined,

  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS ?? 10),

  clientUrl: requireEnv('CLIENT_URL'),
  adminUrl: requireEnv('ADMIN_URL'),

  // Required only for first SUPER_ADMIN bootstrap endpoint.
  adminBootstrapSecret: process.env.ADMIN_BOOTSTRAP_SECRET?.trim() || undefined,
  
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
};

