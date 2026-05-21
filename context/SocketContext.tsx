import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { useAuthOptional } from './AuthContext';
import { connectSocket, disconnectSocket, getSocket } from '../lib/services/socket.service';
import { importSharedSession, type SharedSession } from '../lib/services/sharedSession.service';
import { Colors, Typography, Spacing, BorderRadius, BlurIntensity } from '../constants/theme';
import type { RootStackNavigationProp } from '../types/navigation';

// ── Types ────────────────────────────────────────────────────────────────────

interface PendingInvite {
  session: SharedSession;
  invitedBy: string;
}

interface SocketContextValue {
  /** Emit a cart-state update to everyone else in the session room. */
  emitSessionUpdate: (sessionId: string, session: SharedSession) => void;
  /** Emit invite events to the selected friends. */
  emitSessionInvite: (session: SharedSession, invitedUserIds: string[]) => void;
  /** Tell everyone the session has ended. */
  emitSessionEnd: (sessionId: string) => void;
  /** Join the socket room for a session (host + members call this on enter). */
  joinSessionRoom: (sessionId: string, userId: string) => void;
  /** Register a one-off listener for session:update events for a given session. */
  onSessionUpdate: (
    sessionId: string,
    cb: (s: SharedSession) => void,
  ) => () => void;
  /** Register a listener for session:ended for a given session. */
  onSessionEnded: (sessionId: string, cb: () => void) => () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthOptional();
  const navigation = useNavigation<RootStackNavigationProp<'ActiveSharedSession'>>();
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);
  const [joiningSession, setJoiningSession] = useState(false);
  const connectedRef = useRef(false);

  // ── Connect / disconnect based on auth state ────────────────────────────
  useEffect(() => {
    const userId = auth?.currentUser?.id ?? auth?.userProfile?.id;
    if (!userId) {
      disconnectSocket();
      connectedRef.current = false;
      return;
    }

    const socket = connectSocket(userId);
    connectedRef.current = true;

    // Listen for incoming invites
    const onInvite = (payload: { session: SharedSession; invitedBy: string }) => {
      setPendingInvite(payload);
    };
    socket.on('session:invite', onInvite);

    return () => {
      socket.off('session:invite', onInvite);
    };
  }, [auth?.currentUser?.id, auth?.userProfile?.id]);

  // ── Invite popup: Accept ────────────────────────────────────────────────
  const handleAccept = useCallback(async () => {
    if (!pendingInvite) return;
    setJoiningSession(true);

    try {
      const { session } = pendingInvite;
      const userId =
        auth?.currentUser?.id ?? auth?.userProfile?.id ?? 'unknown';

      // 1. Persist session to this device's AsyncStorage
      await importSharedSession(session);

      // 2. Join the live session room so cart updates reach this device immediately
      const socket = getSocket();
      socket.emit('session:accept', { sessionId: session.id, userId });

      // 3. Navigate to the session screen
      setPendingInvite(null);
      navigation.navigate('ActiveSharedSession', { sessionId: session.id });
    } finally {
      setJoiningSession(false);
    }
  }, [pendingInvite, auth?.currentUser?.id, auth?.userProfile?.id, navigation]);

  // ── Invite popup: Decline ───────────────────────────────────────────────
  const handleDecline = useCallback(() => {
    setPendingInvite(null);
  }, []);

  // ── Context helpers ─────────────────────────────────────────────────────
  const emitSessionUpdate = useCallback(
    (sessionId: string, session: SharedSession) => {
      getSocket().emit('session:update', { sessionId, session });
    },
    [],
  );

  const emitSessionInvite = useCallback(
    (session: SharedSession, invitedUserIds: string[]) => {
      getSocket().emit('session:invite', { session, invitedUserIds });
    },
    [],
  );

  const emitSessionEnd = useCallback((sessionId: string) => {
    getSocket().emit('session:end', { sessionId });
  }, []);

  const joinSessionRoom = useCallback(
    (sessionId: string, userId: string) => {
      getSocket().emit('session:accept', { sessionId, userId });
    },
    [],
  );

  const onSessionUpdate = useCallback(
    (sessionId: string, cb: (s: SharedSession) => void) => {
      const socket = getSocket();
      const handler = ({ session }: { session: SharedSession }) => {
        if (session?.id === sessionId) cb(session);
      };
      socket.on('session:update', handler);
      return () => socket.off('session:update', handler);
    },
    [],
  );

  const onSessionEnded = useCallback(
    (sessionId: string, cb: () => void) => {
      const socket = getSocket();
      const handler = ({ sessionId: sid }: { sessionId: string }) => {
        if (sid === sessionId) cb();
      };
      socket.on('session:ended', handler);
      return () => socket.off('session:ended', handler);
    },
    [],
  );

  const value: SocketContextValue = {
    emitSessionUpdate,
    emitSessionInvite,
    emitSessionEnd,
    joinSessionRoom,
    onSessionUpdate,
    onSessionEnded,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}

      {/* ── Global invite popup ──────────────────────────────────────── */}
      <Modal
        visible={!!pendingInvite}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={handleDecline}
      >
        <View style={styles.backdrop}>
          <BlurView intensity={BlurIntensity.medium} tint="dark" style={styles.blur}>
            <LinearGradient
              colors={[Colors.glass.medium, Colors.glass.dark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <Text style={styles.emoji}>🛒</Text>
              <Text style={styles.title}>Shopping Invite!</Text>
              <Text style={styles.body}>
                <Text style={styles.hostName}>{pendingInvite?.invitedBy ?? 'Someone'}</Text>
                {' '}invited you to join a shared shopping session.
              </Text>

              {joiningSession ? (
                <ActivityIndicator
                  color={Colors.accent.neon}
                  style={{ marginTop: Spacing.lg }}
                />
              ) : (
                <View style={styles.btnRow}>
                  <Pressable style={styles.declineBtn} onPress={handleDecline}>
                    <Text style={styles.declineText}>Decline</Text>
                  </Pressable>
                  <Pressable style={styles.acceptWrap} onPress={() => void handleAccept()}>
                    <LinearGradient
                      colors={[Colors.accent.primary, Colors.accent.secondary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.acceptBtn}
                    >
                      <Text style={styles.acceptText}>Join Session</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              )}
            </LinearGradient>
          </BlurView>
        </View>
      </Modal>
    </SocketContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}

export function useSocketOptional(): SocketContextValue | null {
  return useContext(SocketContext);
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  blur: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 380,
  },
  card: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.xl,
    color: Colors.dark.text,
    marginBottom: Spacing.sm,
  },
  body: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.base,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  hostName: {
    fontFamily: Typography.fonts.primarySemiBold,
    color: Colors.accent.neon,
  },
  btnRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  declineBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  declineText: {
    fontFamily: Typography.fonts.primaryMedium,
    fontSize: Typography.sizes.base,
    color: Colors.dark.textSecondary,
  },
  acceptWrap: {
    flex: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  acceptBtn: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  acceptText: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
    color: '#FFFFFF',
  },
});
