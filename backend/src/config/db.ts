import dns from 'dns';
import mongoose from 'mongoose';
import { env } from './env';

function parseServers(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function setPublicDns() {
  dns.setServers(['1.1.1.1', '1.0.0.1', '8.8.8.8', '8.8.4.4']);
}

function configureDns() {
  // Prefer system DNS. Only override if DNS_SERVERS is explicitly provided.
  const raw = String(process.env.DNS_SERVERS ?? '');
  const servers = parseServers(raw);
  if (servers.length) dns.setServers(servers);
}

function shouldForceLookup(): boolean {
  return String(process.env.FORCE_DNS_LOOKUP ?? 'false').toLowerCase() === 'true';
}

function installLookupShim() {
  /**
   * On some Windows networks, OS DNS cannot resolve Atlas shard hostnames even
   * though public DNS can. `dns.lookup()` uses the OS resolver and ignores
   * `dns.setServers()`, but `dns.resolve4/6()` uses c-ares and honors it.
   *
   * The MongoDB driver ultimately relies on `dns.lookup()` for A/AAAA records,
   * so we shim it (opt-in) to use resolve4/6 for hostname lookups.
   */
  if (!shouldForceLookup()) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const origLookup = (dns as any).lookup;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (dns as any).lookup = (hostname: string, options: any, callback?: any) => {
    const cb = typeof options === 'function' ? options : callback;
    const opts = typeof options === 'object' && options ? options : {};
    const all = Boolean(opts.all);
    const family = opts.family === 6 ? 6 : 4;

    const done = (err: NodeJS.ErrnoException | null, addrs?: string[]) => {
      if (err) return cb(err);
      const list = (addrs ?? []).filter(Boolean);
      if (list.length === 0) {
        const e: NodeJS.ErrnoException = new Error(`ENOTFOUND ${hostname}`) as any;
        e.code = 'ENOTFOUND';
        return cb(e);
      }
      if (all) {
        return cb(
          null,
          list.map((address) => ({ address, family })),
        );
      }
      return cb(null, list[0], family);
    };

    if (family === 6) {
      return dns.resolve6(hostname, (err, addrs) => done(err as any, addrs as any));
    }
    return dns.resolve4(hostname, (err, addrs) => done(err as any, addrs as any));
  };

  void origLookup;
}

function isDnsRelated(err: any): boolean {
  const msg = String(err?.message ?? err);
  return (
    msg.includes('querySrv') ||
    msg.includes('_mongodb._tcp') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('EAI_AGAIN')
  );
}

async function connectOnce(uri: string) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    autoIndex: true,
    serverSelectionTimeoutMS: 10_000,
  });
}

let connectInFlight: Promise<void> | null = null;
let lastError: string | null = null;

export function getLastDbError(): string | null {
  return lastError;
}

export async function connectDB(): Promise<void> {
  try {
    // Helps on networks where IPv6 DNS causes flakiness
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dns as any).setDefaultResultOrder?.('ipv4first');

    configureDns();
    installLookupShim();

    if (mongoose.connection.readyState === 1) return;
    if (connectInFlight) return await connectInFlight;

    connectInFlight = (async () => {
      try {
        try {
          await connectOnce(env.mongoUri);
        } catch (err: any) {
          // If DNS/SRV fails, retry once using public DNS (only when user didn't override DNS_SERVERS).
          if (isDnsRelated(err) && !String(process.env.DNS_SERVERS ?? '').trim()) {
            setPublicDns();
            installLookupShim();
            await connectOnce(env.mongoUri);
          } else {
            throw err;
          }
        }

        // Final fallback: non-SRV URI if provided
        if (mongoose.connection.readyState !== 1 && env.mongoUriFallback) {
          await connectOnce(env.mongoUriFallback);
        }

        lastError = null;
        // eslint-disable-next-line no-console
        console.log('MongoDB Connected');
      } catch (e: any) {
        lastError = String(e?.message ?? e);
        throw e;
      } finally {
        connectInFlight = null;
      }
    })();

    await connectInFlight;

    // eslint-disable-next-line no-console
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[db] MongoDB connection error:', err);
    if (env.allowNoDb) {
      // eslint-disable-next-line no-console
      console.warn('[db] Continuing without MongoDB because ALLOW_NO_DB=true');
      return;
    }
    throw err;
  }
}

