import { Server as SocketServer, Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';

// userId → socket.id  (one active session per user is enough for a demo)
const userSocketMap = new Map<string, string>();

// sessionId → latest snapshot (so late-joiners can get the current state)
const sessionSnapshots = new Map<string, unknown>();

type InviteEnvelope = { session: unknown; invitedBy: string };

const MAX_PENDING_INVITES_PER_USER = 10;

function sessionIdFromInvitedSession(session: unknown): string | undefined {
  const s = session as { id?: string };
  return typeof s?.id === 'string' ? s.id : undefined;
}

/** Invites received before this user has called `identify` (or reconnect race). */
const pendingInvitesByUserId = new Map<string, InviteEnvelope[]>();

function inviteQueueFor(userId: string): InviteEnvelope[] {
  let q = pendingInvitesByUserId.get(userId);
  if (!q) {
    q = [];
    pendingInvitesByUserId.set(userId, q);
  }
  return q;
}

function enqueuePendingInvite(userId: string, invite: InviteEnvelope): void {
  const sid = sessionIdFromInvitedSession(invite.session);
  const q = inviteQueueFor(userId);
  if (sid && q.some((e) => sessionIdFromInvitedSession(e.session) === sid)) return;
  q.push(invite);
  while (q.length > MAX_PENDING_INVITES_PER_USER) q.shift();
}

function userInviteRoomSize(io: SocketServer, userId: string): number {
  return io.sockets.adapter.rooms.get(`user:${userId}`)?.size ?? 0;
}

function flushPendingInvitesForSocket(socket: Socket, userId: string): void {
  const pending = pendingInvitesByUserId.get(userId);
  if (!pending?.length) return;
  pendingInvitesByUserId.delete(userId);
  for (const invite of pending) {
    socket.emit('session:invite', invite);
  }
}
export function setupSessionSocket(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    // ── 1. User registers with their userId ──────────────────────────────
    socket.on('identify', (userId: string) => {
      if (!userId) return;
      userSocketMap.set(userId, socket.id);
      socket.join(`user:${userId}`);
      socket.data.userId = userId;
      flushPendingInvitesForSocket(socket, userId);
    });

    // ── 2. Host sends invite to selected friends ─────────────────────────
    socket.on(
      'session:invite',
      ({ session, invitedUserIds }: { session: unknown; invitedUserIds: string[] }) => {
        if (!session || !Array.isArray(invitedUserIds)) return;
        const s = session as { id?: string; participants?: Array<{ role: string; name: string }> };
        if (!s.id) return;

        // Store snapshot so late-joiners can receive it
        sessionSnapshots.set(s.id, session);
        // Host joins the session room
        void socket.join(`session:${s.id}`);

        const hostName =
          s.participants?.find((p) => p.role === 'HOST')?.name ?? 'Someone';

        for (const uid of invitedUserIds) {
          const envelope: InviteEnvelope = { session, invitedBy: hostName };
          if (userInviteRoomSize(io, uid) > 0) {
            io.to(`user:${uid}`).emit('session:invite', envelope);
          } else {
            enqueuePendingInvite(uid, envelope);
          }
        }
      },
    );

    // ── 3. Friend accepts — joins the session room ───────────────────────
    socket.on(
      'session:accept',
      ({ sessionId, userId }: { sessionId: string; userId: string }) => {
        if (!sessionId || !userId) return;
        void socket.join(`session:${sessionId}`);
        socket.to(`session:${sessionId}`).emit('session:participant:joined', { userId });
        // Send the current snapshot to the joining member
        const snap = sessionSnapshots.get(sessionId);
        if (snap) socket.emit('session:update', { session: snap });
      },
    );

    // ── 4. Any member broadcasts a cart update ───────────────────────────
    socket.on(
      'session:update',
      ({ sessionId, session }: { sessionId: string; session: unknown }) => {
        if (!sessionId || !session) return;
        sessionSnapshots.set(sessionId, session);
        socket.to(`session:${sessionId}`).emit('session:update', { session });
      },
    );

    // ── 5. Host ends the session ─────────────────────────────────────────
    socket.on('session:end', ({ sessionId }: { sessionId: string }) => {
      if (!sessionId) return;
      sessionSnapshots.delete(sessionId);
      for (const [uid, list] of Array.from(pendingInvitesByUserId.entries())) {
        const next = list.filter((e) => sessionIdFromInvitedSession(e.session) !== sessionId);
        if (next.length) pendingInvitesByUserId.set(uid, next);
        else pendingInvitesByUserId.delete(uid);
      }
      io.to(`session:${sessionId}`).emit('session:ended', { sessionId });
    });

    // ── 6. Cleanup on disconnect ─────────────────────────────────────────
    socket.on('disconnect', () => {
      const uid = socket.data.userId as string | undefined;
      if (uid) userSocketMap.delete(uid);
    });
  });

  return io;
}
