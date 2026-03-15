import http from 'http';
import { connectDB } from './config/db';
import { env } from './config/env';
import { createApp } from './app';
import { setupSessionSocket } from './socket/session.socket';

async function main() {
  const app = createApp();
  const httpServer = http.createServer(app);

  // Attach Socket.IO for real-time shared cart
  setupSessionSocket(httpServer);

  httpServer.listen(env.port, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on port ${env.port} (HTTP + WS)`);
  });

  // Connect DB in the background so the API can still respond (e.g. /api/health)
  try {
    await connectDB();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[server] MongoDB connection failed:', err);
    if (env.nodeEnv === 'production' && !env.allowNoDb) process.exit(1);
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[server] Startup error:', err);
  process.exit(1);
});
