import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useResolvedTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeOutUp,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import GlassButton from '../components/GlassButton';
import GlassCard from '../components/GlassCard';
import SharedCartHeader from '../components/sharedCart/SharedCartHeader';
import ParticipantAvatar from '../components/sharedCart/ParticipantAvatar';
import SyncStatusBadge from '../components/sharedCart/SyncStatusBadge';
import ActivityToast from '../components/sharedCart/ActivityToast';
import ParticipantBudgetCard from '../components/sharedCart/ParticipantBudgetCard';
import AppFooter from '../components/AppFooter';
import CartSummaryCard from '../components/personalCart/CartSummaryCard';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { usePersonalCartOptional } from '../context/PersonalCartContext';
import type { RootStackParamList, RootStackNavigationProp } from '../types/navigation';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { formatLkr } from '../lib/utils/currency';
import {
  addItemToSharedSession,
  clearSharedSessionForegroundParticipation,
  endSharedSession,
  getSharedSession,
  importSharedSession,
  markSharedSessionEndedLocally,
  removeItemFromSharedSession,
  setSharedSessionForegroundParticipation,
  subscribeToSharedSession,
  updateSharedItemQuantity,
  type SharedCartItem,
  type SharedSession } from '../lib/services/sharedSession.service';
import { playAddToCartChime } from '../lib/sounds/uiChimes';
import { SHARED_SESSION_PAYMENT_TITLE } from '../lib/services/personalCheckoutHistory.service';
import { useSocket } from '../context/SocketContext';

type ScreenRoute = RouteProp<RootStackParamList, 'ActiveSharedSession'>;

const SWIPE_THRESHOLD = -110;

function toMoney(n: number) {
  return formatLkr(n);
}

interface OrbProps {
  size: number;
  color: string;
  top: number;
  left?: number;
  right?: number;
  driftX: [number, number];
  driftY: [number, number];
  duration: number;
}

function FloatingOrb({ size, color, top, left, right, driftX, driftY, duration }: OrbProps) {
  const tx = useSharedValue(driftX[0]);
  const ty = useSharedValue(driftY[0]);

  useEffect(() => {
    tx.value = withRepeat(
      withSequence(
        withTiming(driftX[1], { duration, easing: Easing.inOut(Easing.ease) }),
        withTiming(driftX[0], { duration, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    ty.value = withRepeat(
      withSequence(
        withTiming(driftY[1], { duration: duration * 1.1, easing: Easing.inOut(Easing.ease) }),
        withTiming(driftY[0], { duration: duration * 1.1, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const motion = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }] }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          top,
          left,
          right },
        motion,
      ]}
    />
  );
}

function CartRow({
  item,
  onRemove,
  onChangeQty }: {
  item: SharedCartItem;
  onRemove: (id: string) => void;
  onChangeQty: (itemId: string, nextQty: number) => void;
}) {
  const { isDark, colors: C } = useResolvedTheme();
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationX < 0) translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX < SWIPE_THRESHOLD) {
        translateX.value = withSpring(-600);
        opacity.value = withTiming(0);
        scale.value = withTiming(0.9);
        onRemove(item.id);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
    opacity: opacity.value }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        entering={FadeInDown.duration(220).springify()}
        exiting={FadeOutUp.duration(180)}
        style={styles.rowWrap}
      >
        <Animated.View style={animatedStyle}>
          <GlassCard style={styles.rowCard} padding={Spacing.md}>
            <View style={styles.rowTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowName, { color: C.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.rowMeta, { color: C.textSecondary }]} numberOfLines={1}>
                  Added by {item.addedByName}
                </Text>
              </View>
              <Text style={styles.rowTotal}>{toMoney(item.price * item.quantity)}</Text>
            </View>

            <View style={styles.rowBottom}>
              <Text style={[styles.rowPrice, { color: C.textTertiary }]}>{toMoney(item.price)} each</Text>
              <View style={styles.qtyRow}>
                <Pressable
                  style={[
                    styles.qtyBtn,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                      borderColor: C.borderSubtle },
                    item.quantity <= 1 && styles.qtyBtnDisabled,
                  ]}
                  onPress={() => onChangeQty(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  <Text style={[styles.qtyBtnText, { color: C.text }]}>−</Text>
                </Pressable>
                <Text style={[styles.qtyVal, { color: C.text }]}>{item.quantity}</Text>
                <Pressable
                  style={[
                    styles.qtyBtn,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                      borderColor: C.borderSubtle },
                  ]}
                  onPress={() => onChangeQty(item.id, item.quantity + 1)}
                >
                  <Text style={[styles.qtyBtnText, { color: C.text }]}>+</Text>
                </Pressable>
              </View>
            </View>
          </GlassCard>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

export default function ActiveSharedSessionScreen() {
  const navigation = useNavigation<RootStackNavigationProp<'ActiveSharedSession'>>();
  const route = useRoute<ScreenRoute>();
  const { sessionId } = route.params;
  const { userProfile, currentUser } = useAuth();
  const personalCart = usePersonalCartOptional();
  const { clearCart } = useCart();

  const [session, setSession] = useState<SharedSession | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('syncing');
  const [toast, setToast] = useState<{ message: string; id: string } | null>(null);

  /** Prevents duplicate SessionReceipt/Home exits when socket + focus both see ENDED. */
  const sessionExitHandledRef = useRef(false);

  const hostId = session?.hostId ?? '';
  const myId = currentUser?.id ?? userProfile?.id ?? 'unknown';
  const isHost = Boolean(hostId) && myId === hostId;

  const { emitSessionUpdate, emitSessionEnd, joinSessionRoom, onSessionUpdate, onSessionEnded } =
    useSocket();

  const showToast = useCallback((message: string) => {
    const id = `toast_${Date.now()}`;
    setToast({ message, id });
    setTimeout(() => setToast(null), 2400);
  }, []);

  const customerDisplayName = useMemo(() => {
    const p = userProfile;
    if (!p) return 'Customer';
    if (p.fullName?.trim()) return p.fullName.trim();
    const n = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
    return n || p.email || 'Customer';
  }, [userProfile]);

  useEffect(() => {
    sessionExitHandledRef.current = false;
  }, [sessionId]);

  useEffect(() => {
    void setSharedSessionForegroundParticipation(sessionId);
    return () => {
      void clearSharedSessionForegroundParticipation(sessionId);
    };
  }, [sessionId]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void getSharedSession(sessionId)
        .then((s) => {
          if (cancelled || s.status !== 'ENDED') return;
          if (sessionExitHandledRef.current) return;
          sessionExitHandledRef.current = true;
          personalCart?.clearCart();
          clearCart();
          navigation.replace('SessionReceipt', {
            sessionId: s.id,
            createdAt: s.createdAt,
            endedAt: new Date().toISOString(),
            customerName: customerDisplayName,
            items: s.items.map((i) => ({
              name: i.name,
              price: i.price,
              quantity: i.quantity })),
            totalAmount: s.totalAmount,
            participantCount: s.participants.length });
        })
        .catch(() => {
          if (cancelled || sessionExitHandledRef.current) return;
          sessionExitHandledRef.current = true;
          personalCart?.clearCart();
          clearCart();
          navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
        });
      return () => {
        cancelled = true;
      };
    }, [sessionId, customerDisplayName, navigation, personalCart, clearCart]),
  );

  useEffect(() => {
    let mounted = true;
    setSyncStatus('syncing');
    void getSharedSession(sessionId)
      .then((s) => {
        if (!mounted) return;
        setSession(s);
        setSyncStatus('synced');
      })
      .catch(() => {
        if (!mounted) return;
        setSyncStatus('offline');
      });
    return () => {
      mounted = false;
    };
  }, [sessionId]);

  useEffect(() => {
    const unsub = subscribeToSharedSession(sessionId, (s) => {
      setSyncStatus('synced');
      setSession(s);
    });
    return unsub;
  }, [sessionId]);

  // ── Join socket room so this device receives remote cart updates ──────────
  useEffect(() => {
    joinSessionRoom(sessionId, myId);
  }, [sessionId, myId, joinSessionRoom]);

  // ── Listen for cart updates pushed by other participants ──────────────────
  useEffect(() => {
    const unsub = onSessionUpdate(sessionId, async (incoming) => {
      await importSharedSession(incoming);
      try {
        const fresh = await getSharedSession(sessionId);
        setSession(fresh);
        setSyncStatus('synced');
      } catch {
        setSyncStatus('offline');
      }
    });
    return unsub;
  }, [sessionId, onSessionUpdate]);

  // ── Listen for session ended by host (or after shared checkout) ───────────
  useEffect(() => {
    const unsub = onSessionEnded(sessionId, () => {
      showToast('Shared session ended');
      void (async () => {
        const ended = await markSharedSessionEndedLocally(sessionId);
        personalCart?.clearCart();
        clearCart();
        setTimeout(() => {
          if (sessionExitHandledRef.current) return;

          // If the current screen is part of the payment flow (host is paying), do not redirect.
          const state = navigation.getState();
          if (state) {
            const currentRoute = state.routes[state.index]?.name;
            if (currentRoute === 'PaymentGateway' || currentRoute === 'PaymentQR' || currentRoute === 'PaymentSuccess') {
              return;
            }
          }

          sessionExitHandledRef.current = true;
          if (ended) {
            navigation.replace('SessionReceipt', {
              sessionId: ended.id,
              createdAt: ended.createdAt,
              endedAt: new Date().toISOString(),
              customerName: customerDisplayName,
              items: ended.items.map((i) => ({
                name: i.name,
                price: i.price,
                quantity: i.quantity })),
              totalAmount: ended.totalAmount,
              participantCount: ended.participants.length });
          } else {
            navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
          }
        }, 450);
      })();
    });
    return unsub;
  }, [sessionId, onSessionEnded, navigation, showToast, customerDisplayName, personalCart, clearCart]);

  const participants = session?.participants ?? [];

  const budgetCards = useMemo(() => {
    return participants.map((p) => {
      const unlimited = p.role === 'HOST' && !(p.allocatedBudget > 0);
      const ratio = unlimited || p.allocatedBudget <= 0 ? 0 : p.spentAmount / p.allocatedBudget;
      const highlight = unlimited ? 'none' : ratio >= 0.95 ? 'danger' : ratio >= 0.8 ? 'warning' : 'none';
      return { ...p, highlight };
    });
  }, [participants]);

  const items = useMemo(() => {
    const list = session?.items ?? [];
    // Inject sessionId for row handlers (keeps row component simple)
    return list.map((i) => ({ ...(i as any), __sessionId: sessionId })) as Array<
      SharedCartItem & { __sessionId: string }
    >;
  }, [session?.items, sessionId]);

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items],
  );

  const handleAdd = useCallback(
    async (item: { name: string; price: number; quantity: number; emoji: string }) => {
      try {
        setSyncStatus('syncing');
        const addedByName =
          userProfile?.fullName ||
          `${userProfile?.firstName ?? ''} ${userProfile?.lastName ?? ''}`.trim() ||
          userProfile?.email ||
          'Me';

        await addItemToSharedSession(sessionId, {
          productId: `barcode_${Date.now()}`,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          addedBy: myId,
          addedByName });
        const updated = await getSharedSession(sessionId);
        setSession(updated);
        emitSessionUpdate(sessionId, updated);
        showToast(`Added ${item.name}`);
        setSyncStatus('synced');
        void playAddToCartChime();
      } catch (e: any) {
        setSyncStatus('synced');
        showToast(String(e?.message ?? 'Unable to add item'));
      }
    },
    [sessionId, myId, userProfile, showToast, emitSessionUpdate],
  );

  const handleRemove = useCallback(
    async (itemId: string) => {
      try {
        setSyncStatus('syncing');
        await removeItemFromSharedSession(sessionId, itemId);
        const updated = await getSharedSession(sessionId);
        setSession(updated);
        emitSessionUpdate(sessionId, updated);
        showToast('Item removed');
        setSyncStatus('synced');
      } catch (e: any) {
        setSyncStatus('synced');
        showToast(String(e?.message ?? 'Unable to remove item'));
      }
    },
    [sessionId, showToast, emitSessionUpdate],
  );

  const handleChangeQty = useCallback(
    async (itemId: string, nextQty: number) => {
      try {
        setSyncStatus('syncing');
        await updateSharedItemQuantity(sessionId, itemId, nextQty);
        const updated = await getSharedSession(sessionId);
        setSession(updated);
        emitSessionUpdate(sessionId, updated);
        setSyncStatus('synced');
      } catch (e: any) {
        setSyncStatus('synced');
        showToast(String(e?.message ?? 'Budget limit exceeded'));
      }
    },
    [sessionId, showToast, emitSessionUpdate],
  );

  const handleLeave = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const openSessionScan = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('ProductScan', {
      closeAfterAdd: true,
      sharedSessionId: sessionId });
  }, [navigation, sessionId]);

  const handleEnd = useCallback(async () => {
    if (!session) return;
    const snap = session;
    setSyncStatus('syncing');
    await endSharedSession(sessionId);
    emitSessionEnd(sessionId);
    showToast('Session ended');
    setSyncStatus('synced');
    personalCart?.clearCart();
    clearCart();
    sessionExitHandledRef.current = true;
    navigation.replace('SessionReceipt', {
      sessionId,
      createdAt: snap.createdAt,
      endedAt: new Date().toISOString(),
      customerName: customerDisplayName,
      items: snap.items.map((i) => ({
        name: i.name,
        price: i.price,
        quantity: i.quantity })),
      totalAmount: snap.totalAmount,
      participantCount: snap.participants.length });
  }, [
    session,
    sessionId,
    emitSessionEnd,
    showToast,
    navigation,
    customerDisplayName,
    personalCart,
    clearCart,
  ]);

  const { isDark, colors: C } = useResolvedTheme();
  const insets = useSafeAreaInsets();

  const bgColors = useMemo<[string, string, string]>(
    () => (isDark ? ['#0A0A0F', '#0D1117', '#0A0E1A'] : ['#EEF2FF', '#F5F0FF', '#EFF6FF']),
    [isDark],
  );

  const orbBlue = isDark ? 'rgba(0,122,255,0.18)' : 'rgba(0,122,255,0.10)';
  const orbPurple = isDark ? 'rgba(175,82,222,0.14)' : 'rgba(175,82,222,0.08)';
  const orbTeal = isDark ? 'rgba(50,215,175,0.10)' : 'rgba(50,215,175,0.07)';

  const headerSubtitle = `${items.length} ${items.length === 1 ? 'item' : 'items'} · ${toMoney(total)}`;

  const listHeader = (
    <>
      <SharedCartHeader
        onBack={handleLeave}
        kicker="Live session"
        subtitle={headerSubtitle}
        trailing={<SyncStatusBadge syncState={{ status: syncStatus, lastSyncedAt: Date.now() }} />}
      />
      <Animated.View entering={FadeInDown.delay(40).duration(300)}>
        <GlassCard style={styles.sessionCard} padding={Spacing.lg}>
          <Text style={[styles.sessionIdLabel, { color: C.textSecondary }]} selectable>
            Session ID · {sessionId}
          </Text>
          <View style={styles.participantsRow}>
            {participants.map((p, idx) => (
              <ParticipantAvatar
                key={p.userId}
                participant={{
                  id: p.userId,
                  name: p.name,
                  avatarUri: p.avatar ?? null,
                  isOnline: true,
                  isHost: idx === 0 }}
                index={idx}
              />
            ))}
          </View>
          {budgetCards.length > 0 && (
            <View style={styles.budgetGrid}>
              {budgetCards.map((p) => (
                <ParticipantBudgetCard
                  key={p.userId}
                  name={p.name}
                  role={p.role}
                  allocatedBudget={p.allocatedBudget}
                  spentAmount={p.spentAmount}
                  remainingBudget={p.remainingBudget}
                  highlight={p.highlight as any}
                />
              ))}
            </View>
          )}
        </GlassCard>
      </Animated.View>

      <View style={styles.sessionActionsRow}>
        {isHost ? (
          <GlassButton
            title="End session"
            variant="outline"
            size="md"
            style={styles.secondaryBtn}
            onPress={() => void handleEnd()}
            accessibilityLabel="End session for everyone"
          />
        ) : (
          <GlassButton
            title="Leave"
            variant="outline"
            size="md"
            style={styles.secondaryBtn}
            onPress={handleLeave}
            accessibilityLabel="Leave session"
          />
        )}
        <GlassButton
          title="Copy ID"
          variant="outline"
          size="md"
          style={styles.secondaryBtn}
          onPress={() => {
            void Clipboard.setStringAsync(sessionId);
            showToast('Session ID copied');
          }}
          accessibilityLabel="Copy session ID"
        />
      </View>

      <View style={styles.listIntro}>
        <Text style={[styles.listTitle, { color: C.text }]}>In your cart</Text>
        <Text style={[styles.listSubtitle, { color: C.textSecondary }]}>
          Swipe left on a row to remove. Everyone sees updates live.
        </Text>
      </View>
    </>
  );

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <Animated.View entering={FadeInDown.duration(380)} style={StyleSheet.absoluteFill}>
        <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <FloatingOrb size={260} color={orbBlue} top={-100} left={-70} driftX={[0, 12]} driftY={[0, 10]} duration={7000} />
        <FloatingOrb
          size={210}
          color={orbPurple}
          top={400}
          right={-55}
          driftX={[0, -10]}
          driftY={[0, 12]}
          duration={8200}
        />
        <FloatingOrb size={170} color={orbTeal} top={140} right={-35} driftX={[0, 8]} driftY={[0, -10]} duration={7600} />
        <View pointerEvents="none" style={StyleSheet.absoluteFill} />
      </Animated.View>

      <ActivityToast message={toast?.message ?? ''} visible={!!toast} />

      <View style={[styles.body, { paddingTop: insets.top, paddingHorizontal: Spacing.lg }]}>
        <FlatList
          style={styles.list}
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom: items.length > 0 ? Spacing.md : Math.max(insets.bottom, Spacing.xl) + 40 },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={listHeader}
          renderItem={({ item }) => (
            <CartRow item={item as any} onRemove={handleRemove} onChangeQty={handleChangeQty} />
          )}
          ListEmptyComponent={
            <Animated.View entering={FadeIn.delay(180).duration(360)} style={styles.emptyWrap}>
              <GlassCard style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="cart-outline" size={40} color={Colors.accent.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: C.text }]}>No items yet</Text>
                <Text style={[styles.emptySub, { color: C.textSecondary }]}>
                  Scan barcodes to add products — everyone in the session will see them in real time.
                </Text>
                <GlassButton
                  title="Start scanning"
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    navigation.navigate('ProductScan', {
                      closeAfterAdd: true,
                      sharedSessionId: sessionId });
                  }}
                  variant="fill"
                  size="lg"
                  icon={<Ionicons name="scan-outline" size={20} color="#FFFFFF" />}
                  accessibilityLabel="Start scanning products"
                />
              </GlassCard>
            </Animated.View>
          }
        />

        {items.length > 0 && (
          <View style={styles.cartFooterWrap}>
            <CartSummaryCard compact subtotal={total} total={total} />
            {isHost ? (
              <>
                <GlassButton
                  title="Proceed to Payment"
                  onPress={() =>
                    navigation.navigate('PaymentGateway', {
                      items: items.map((i) => ({
                        id: i.id,
                        productId: i.productId,
                        name: i.name,
                        price: i.price,
                        quantity: i.quantity })),
                      totalAmount: total,
                      title: SHARED_SESSION_PAYMENT_TITLE,
                      sharedSessionId: sessionId })
                  }
                  variant="fill"
                  size="lg"
                  disabled={items.length === 0}
                  style={styles.payBtn}
                  accessibilityLabel="Proceed to payment"
                />
                <GlassButton
                  title="Scan product"
                  onPress={openSessionScan}
                  variant="outline"
                  size="md"
                  style={styles.hostFooterScanBtn}
                  icon={<Ionicons name="scan-outline" size={20} color={Colors.accent.primary} />}
                  accessibilityLabel="Scan a product barcode"
                />
              </>
            ) : (
              <GlassCard style={styles.waitingCard}>
                <Text style={[styles.waitingText, { color: C.textSecondary }]}>
                  Waiting for the host to proceed to payment.
                </Text>
                <GlassButton
                  title="Scan product"
                  onPress={openSessionScan}
                  variant="outline"
                  size="md"
                  style={styles.guestScanInWaitingBtn}
                  icon={<Ionicons name="scan-outline" size={20} color={Colors.accent.primary} />}
                  accessibilityLabel="Scan a product barcode"
                />
              </GlassCard>
            )}
          </View>
        )}

        <View style={{ paddingBottom: Math.max(insets.bottom, Spacing.md) }}>
          <AppFooter />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  orb: { position: 'absolute' },
  body: { flex: 1 },
  cartFooterWrap: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm },
  list: { flex: 1 },
  /** Host: fixed above app footer, under primary CTA */
  hostFooterScanBtn: {
    width: '100%',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md },
  listContent: {
    flexGrow: 1 },
  sessionCard: {
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md },
  sessionIdLabel: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.xs,
    marginBottom: Spacing.sm },
  participantsRow: {
    marginTop: Spacing.xs,
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap' },
  budgetGrid: {
    marginTop: Spacing.md,
    gap: Spacing.sm },
  sessionActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md },
  secondaryBtn: { flex: 1 },
  listIntro: {
    marginBottom: Spacing.md,
    marginTop: Spacing.xs },
  listTitle: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.xl,
    marginBottom: 2 },
  listSubtitle: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    lineHeight: 20 },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'] },
  emptyCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    alignItems: 'center' },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(0,122,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg },
  emptyTitle: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes['2xl'],
    marginBottom: Spacing.sm,
    textAlign: 'center' },
  emptySub: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.base,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm },
  rowWrap: { marginBottom: Spacing.md },
  rowCard: {
    borderRadius: BorderRadius.lg },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  rowName: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base },
  rowMeta: {
    marginTop: 2,
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm },
  rowTotal: {
    fontFamily: Typography.fonts.accentBold,
    fontSize: Typography.sizes.lg,
    color: Colors.accent.primary },
  rowBottom: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between' },
  rowPrice: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center' },
  qtyBtnDisabled: { opacity: 0.5 },
  qtyBtnText: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.lg,
    marginTop: -1 },
  qtyVal: {
    minWidth: 26,
    textAlign: 'center',
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base },
  payBtn: {
    width: '100%' },
  waitingCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md },
  guestScanInWaitingBtn: {
    width: '100%',
    marginTop: Spacing.md },
  waitingText: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20 } });

