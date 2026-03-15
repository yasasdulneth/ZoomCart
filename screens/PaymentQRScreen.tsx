import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeInDown,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';
import { useCart } from '../context/CartContext';
import { usePersonalCartOptional } from '../context/PersonalCartContext';
import { useAuthOptional } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { createPaymentFromItems, fetchPaymentStatus } from '../lib/api/payments';
import type { PaymentItemInput, PaymentStatus } from '../lib/api/payments';
import { formatLkr } from '../lib/utils/currency';
import { Colors, Typography, Spacing, BorderRadius, DarkColors, LightColors } from '../constants/theme';
import QRContainer from '../components/paymentQR/QRContainer';
import CountdownTimer from '../components/paymentQR/CountdownTimer';
import PaymentStatusBadge from '../components/paymentQR/PaymentStatusBadge';
import SharedCartHeader from '../components/sharedCart/SharedCartHeader';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import AppFooter from '../components/AppFooter';
import { deductOrderStock } from '../lib/services/inventory.service';
import {
  appendPersonalCheckoutRecord,
  SHARED_SESSION_PAYMENT_TITLE,
} from '../lib/services/personalCheckoutHistory.service';
import { markSharedSessionEndedLocally } from '../lib/services/sharedSession.service';
import { useSocket } from '../context/SocketContext';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

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
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

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
          right,
        },
        motion,
      ]}
    />
  );
}

const PaymentQRScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'PaymentQR'>>();
  const insets = useSafeAreaInsets();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const C = isDark ? DarkColors : LightColors;
  const { t } = useTranslation();

  const { items: cartItems, clearCart } = useCart();
  const personalCart = usePersonalCartOptional();
  const auth = useAuthOptional();
  const { emitSessionEnd } = useSocket();

  const routeItems = route.params && 'items' in route.params ? route.params.items : undefined;
  const routeTotal = route.params && 'totalAmount' in route.params ? route.params.totalAmount : undefined;
  const titleOverride = route.params && 'title' in route.params ? route.params.title : undefined;
  const sharedSessionId =
    route.params && 'sharedSessionId' in route.params
      ? (route.params as { sharedSessionId?: string }).sharedSessionId
      : undefined;

  const useRouteItems = !!(routeItems && routeItems.length > 0);
  const usePersonal = !useRouteItems && !!(personalCart && personalCart.items.length > 0);

  const paymentItems: PaymentItemInput[] = useMemo(() => {
    if (useRouteItems && routeItems) return routeItems;
    if (usePersonal && personalCart) return personalCart.items;
    return cartItems.map((i) => ({
      id: i.product.id,
      name: i.product.name,
      price: i.product.price,
      quantity: i.quantity,
    }));
  }, [useRouteItems, routeItems, usePersonal, personalCart, cartItems]);

  const totalAmount = useMemo(() => {
    if (typeof routeTotal === 'number' && Number.isFinite(routeTotal)) return routeTotal;
    return paymentItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  }, [routeTotal, paymentItems]);

  const loyaltyPts = useMemo(() => {
    const raw =
      route.params && 'loyaltyPointsRedeemed' in route.params
        ? (route.params as { loyaltyPointsRedeemed?: number }).loyaltyPointsRedeemed
        : 0;
    return Math.max(0, Math.floor(Number(raw ?? 0)));
  }, [route.params]);

  const orderSubtotal = useMemo(() => {
    if (
      route.params &&
      'orderSubtotal' in route.params &&
      typeof (route.params as { orderSubtotal?: number }).orderSubtotal === 'number'
    ) {
      return (route.params as { orderSubtotal: number }).orderSubtotal;
    }
    return totalAmount;
  }, [route.params, totalAmount]);

  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [status, setStatus] = useState<PaymentStatus>('PENDING');
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const creatingRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const successScale = useSharedValue(0.96);
  const successOpacity = useSharedValue(0);

  const expired = useMemo(() => (expiresAt ? now >= expiresAt : false), [expiresAt, now]);

  const bgColors = useMemo<[string, string, string]>(
    () => (isDark ? ['#0A0A0F', '#0D1117', '#0A0E1A'] : ['#EEF2FF', '#F5F0FF', '#EFF6FF']),
    [isDark],
  );
  const orbBlue = isDark ? 'rgba(0,122,255,0.18)' : 'rgba(0,122,255,0.10)';
  const orbPurple = isDark ? 'rgba(175,82,222,0.14)' : 'rgba(175,82,222,0.08)';
  const orbTeal = isDark ? 'rgba(50,215,175,0.10)' : 'rgba(50,215,175,0.07)';

  const totalLabel = titleOverride ?? (useRouteItems ? 'Session total' : usePersonal ? 'Your cart' : 'Cart total');

  const initPayment = async (options?: { force?: boolean }) => {
    if (creatingRef.current) return;
    if (!options?.force && paymentId && token && expiresAt) return;
    const hasItems = paymentItems.length > 0;
    if (!hasItems) return;
    creatingRef.current = true;
    setError(null);
    setStatus('PENDING');
    try {
      const res = await createPaymentFromItems(paymentItems, totalAmount, 'qr', {
        loyaltyPointsRedeemed: loyaltyPts,
      });
      setPaymentId(res.paymentId);
      setToken(res.token);
      setExpiresAt(res.expiresAt);
      setStatus('PENDING');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      creatingRef.current = false;
    }
  };

  useEffect(() => {
    initPayment();

    tickRef.current = setInterval(() => setNow(Date.now()), 250);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (refreshRef.current) clearInterval(refreshRef.current);
    refreshRef.current = setInterval(() => {
      if (creatingRef.current) return;
      if (status !== 'PENDING') return;
      setPaymentId(null);
      setToken(null);
      setExpiresAt(null);
      initPayment({ force: true });
    }, 90_000);

    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
      refreshRef.current = null;
    };
  }, [status]);

  useEffect(() => {
    if (!paymentId) return;
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetchPaymentStatus(paymentId);
        setStatus(res.status);
      } catch {
        // keep last known status
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [paymentId]);

  useEffect(() => {
    if (expired && status !== 'VERIFIED') {
      setStatus('EXPIRED');
    }
  }, [expired, status]);

  useEffect(() => {
    if (status === 'VERIFIED') {
      if (pollRef.current) clearInterval(pollRef.current);
      successOpacity.value = withTiming(1, { duration: 280 });
      successScale.value = withSpring(1, { damping: 14, stiffness: 140 });

      void deductOrderStock(
        paymentItems.map((i) => ({ productId: (i as any).productId ?? i.id, quantity: i.quantity })),
      ).catch(() => {});

      if (paymentId) {
        void auth?.refreshProfile?.().catch(() => {});
      }

      if (titleOverride !== SHARED_SESSION_PAYMENT_TITLE) {
        const uid = auth?.currentUser?.id ?? auth?.userProfile?.id;
        const itemQtySum = paymentItems.reduce((s, i) => s + i.quantity, 0);
        void appendPersonalCheckoutRecord({
          paymentId: paymentId ?? undefined,
          userId: uid,
          totalAmount,
          itemCount: itemQtySum,
          title: titleOverride ?? (usePersonal ? 'My cart' : 'Checkout'),
          items: paymentItems.map((i) => ({
            name: i.name,
            price: i.price,
            quantity: i.quantity,
          })),
        }).catch(() => {});
      }

      const t = setTimeout(() => {
        void (async () => {
          if (useRouteItems || titleOverride === SHARED_SESSION_PAYMENT_TITLE) {
            if (personalCart) personalCart.clearCart();
            clearCart();
          } else if (!useRouteItems) {
            if (usePersonal && personalCart) personalCart.clearCart();
            else clearCart();
          }
          if (sharedSessionId && titleOverride === SHARED_SESSION_PAYMENT_TITLE) {
            await markSharedSessionEndedLocally(sharedSessionId);
            emitSessionEnd(sharedSessionId);
          }
          if (paymentId) {
            void fetchPaymentStatus(paymentId).then((res) => {
              (navigation.navigate as any)('PaymentSuccess', {
                paymentId: res.paymentId,
                orderId: res.orderId,
                amount: totalAmount,
                customer: res.customer,
                items: paymentItems.map((i) => ({
                  name: i.name,
                  price: i.price,
                  quantity: i.quantity,
                })),
                orderSubtotal,
                loyaltyPointsRedeemed: loyaltyPts,
                ...(sharedSessionId && titleOverride === SHARED_SESSION_PAYMENT_TITLE
                  ? { sharedSessionId }
                  : {}),
              });
            });
          }
        })();
      }, 1600);
      return () => clearTimeout(t);
    }
    return;
  }, [
    status,
    paymentId,
    totalAmount,
    auth,
    useRouteItems,
    usePersonal,
    personalCart,
    clearCart,
    navigation,
    successOpacity,
    successScale,
    titleOverride,
    sharedSessionId,
    emitSessionEnd,
    paymentItems,
    orderSubtotal,
    loyaltyPts,
  ]);

  const successStyle = useAnimatedStyle(() => ({
    opacity: successOpacity.value,
    transform: [{ scale: successScale.value }],
  }));

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <Animated.View entering={FadeInDown.duration(320)} style={StyleSheet.absoluteFill}>
        <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <FloatingOrb size={220} color={orbBlue} top={-70} left={-50} driftX={[0, 8]} driftY={[0, 8]} duration={7000} />
        <FloatingOrb size={190} color={orbPurple} top={280} right={-40} driftX={[0, -8]} driftY={[0, 10]} duration={8200} />
        <FloatingOrb size={150} color={orbTeal} top={100} right={-28} driftX={[0, 6]} driftY={[0, -8]} duration={7800} />
      </Animated.View>

      <View
        style={[
          styles.body,
          {
            paddingTop: insets.top + Spacing.sm,
            paddingBottom: Math.max(insets.bottom, Spacing.md),
          },
        ]}
      >
        <SharedCartHeader
          onBack={() => navigation.goBack()}
          kicker={t('payment.pay_qr_kicker')}
          title={t('payment.pay_qr_title')}
          subtitle={t('payment.pay_qr_sub')}
        />

        <Animated.View entering={FadeInDown.delay(40).duration(280)} style={{ paddingHorizontal: Spacing.lg }}>
          <GlassCard style={styles.amountCard} padding={Spacing.md}>
            <View style={styles.amountRow}>
              <Text style={[styles.amountLabel, { color: C.textSecondary }]}>{t('payment.order_subtotal')}</Text>
              <Text style={[styles.amountValueSm, { color: C.text }]}>{formatLkr(orderSubtotal)}</Text>
            </View>
            {loyaltyPts > 0 ? (
              <View style={[styles.amountRow, styles.amountRowTight]}>
                <Text style={[styles.amountLabel, { color: C.textSecondary }]}>{t('payment.zoompoints_redeem_line')}</Text>
                <Text style={[styles.amountValueSm, { color: Colors.accent.green }]}>−{formatLkr(loyaltyPts)}</Text>
              </View>
            ) : null}
            <View style={[styles.amountDivider, { backgroundColor: C.borderSubtle ?? 'rgba(0,0,0,0.08)' }]} />
            <View style={styles.amountRow}>
              <Text style={[styles.amountLabelStrong, { color: C.textSecondary }]}>{totalLabel}</Text>
              <Text style={[styles.amountValue, { color: Colors.accent.primary }]}>{formatLkr(totalAmount)}</Text>
            </View>
            <Text style={[styles.payableHint, { color: C.textTertiary }]}>{t('payment.pay_qr_payable_caption')}</Text>
          </GlassCard>
        </Animated.View>

        <View style={styles.center}>
          <QRContainer token={token} disabled={status === 'EXPIRED'} footerText={paymentId ? `Payment ID: ${paymentId.slice(0, 10)}…` : undefined} />

          <CountdownTimer expiresAt={expiresAt} now={now} />
          <PaymentStatusBadge status={status} />

          {!!error && (
            <GlassCard style={[styles.errorBox, { borderColor: `${Colors.accent.red}44` }]} padding={Spacing.lg}>
              <Text style={[styles.errorTitle, { color: C.text }]}>Couldn’t generate QR</Text>
              <Text style={[styles.errorText, { color: C.textSecondary }]}>{error}</Text>
              <GlassButton title="Retry" onPress={() => void initPayment({ force: true })} variant="outline" size="md" />
            </GlassCard>
          )}

          {status === 'EXPIRED' && (
            <Text style={[styles.expiredHintText, { color: C.textSecondary }]}>
              This QR expired. Go back and open QR payment again to regenerate.
            </Text>
          )}
        </View>

        <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
          <AppFooter />
        </View>
      </View>

      <Animated.View pointerEvents="none" style={[styles.successOverlay, successStyle]}>
        <LinearGradient
          colors={['rgba(0,245,255,0.25)', 'rgba(99,102,241,0.18)', isDark ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.85)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.successCard, { borderColor: Colors.accent.neon + '55' }]}
        >
          <Text style={styles.successIcon}>✓</Text>
          <Text style={[styles.successText, { color: isDark ? '#FFFFFF' : LightColors.text }]}>Payment verified</Text>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  orb: { position: 'absolute' },
  body: {
    flex: 1,
  },
  amountCard: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountRowTight: {
    marginTop: Spacing.xs,
  },
  amountDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.sm,
  },
  amountLabel: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
  },
  amountLabelStrong: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.sm,
  },
  amountValueSm: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.lg,
  },
  payableHint: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.sm,
  },
  amountValue: {
    fontFamily: Typography.fonts.accentBold,
    fontSize: Typography.sizes['2xl'],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  errorBox: {
    width: Math.min(width * 0.92, 420),
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
  },
  errorTitle: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: Typography.sizes.lg,
  },
  errorText: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
  },
  expiredHintText: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  successCard: {
    padding: Spacing['2xl'],
    alignItems: 'center',
    minWidth: width * 0.7,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  successIcon: {
    fontSize: 64,
    color: Colors.accent.neon,
    marginBottom: Spacing.md,
  },
  successText: {
    fontFamily: Typography.fonts.accentBold,
    fontSize: Typography.sizes['2xl'],
  },
});

export default PaymentQRScreen;
