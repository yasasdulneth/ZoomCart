import { io, type Socket } from 'socket.io-client';

// Strip /api suffix to get the raw server origin for WebSocket connection
const SOCKET_URL = (() => {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:5000/api';
  return base.replace(/\/api\/?$/, '');
})();

let socket: Socket | null = null;
/** User id we're registering with — re-emitted on every reconnect. */
let registeredUserId: string | null = null;
let onConnectIdentify: (() => void) | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1500,
      timeout: 10000,
    });
  }
  return socket;
}

/** Connect and register this user so the server can route invites to them. */
export function connectSocket(userId: string): Socket {
  const s = getSocket();

  if (onConnectIdentify) {
    s.off('connect', onConnectIdentify);
    onConnectIdentify = null;
  }

  registeredUserId = userId;
  const identify = () => {
    if (registeredUserId) s.emit('identify', registeredUserId);
  };
  onConnectIdentify = identify;
  s.on('connect', identify);

  if (s.connected) {
    identify();
  } else {
    s.connect();
  }

  return s;
}

export function disconnectSocket(): void {
  if (socket && onConnectIdentify) {
    socket.off('connect', onConnectIdentify);
    onConnectIdentify = null;
  }
  registeredUserId = null;
  socket?.disconnect();
  socket = null;
}
