import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ToastAndroid,
  Pressable,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStripe } from '@stripe/stripe-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { usePersonalCartOptional } from '../context/PersonalCartContext';
import { useCart } from '../context/CartContext';
import { useAuthOptional } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatLkr } from '../lib/utils/currency';
import { createPaymentFromItems, verifyStripePayment, completeZeroPayment } from '../lib/api/payments';
import { deductOrderStock } from '../lib/services/inventory.service';
import {
  calculateEarnedPoints,
  maxRedeemableZoomPoints,
  payableAfterZoomPoints,
} from '../lib/services/loyalty.service';
import {
  appendPersonalCheckoutRecord,
  SHARED_SESSION_PAYMENT_TITLE,
} from '../lib/services/personalCheckoutHistory.service';
import { markSharedSessionEndedLocally } from '../lib/services/sharedSession.service';
import { useSocket } from '../context/SocketContext';
import { Colors, Typography, Spacing, BorderRadius, DarkColors, LightColors, BlurIntensity } from '../constants/theme';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import SharedCartHeader from '../components/sharedCart/SharedCartHeader';
import AppFooter from '../components/AppFooter';
import type { RootStackParamList } from '../types/navigation';
import { useTranslation } from 'react-i18next';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'PaymentGateway'>;
type ScreenRoute = RouteProp<RootStackParamList, 'PaymentGateway'>;

type PaymentMethod = 'qr' | 'card';

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

function MethodCard({
  iconName,
  title,
  subtitle,
  selected,
  onPress,
  accentColor,
  isDark,
  textColor,
  subtextColor,
}: {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
  accentColor: string;
  isDark: boolean;
  textColor: string;
  subtextColor: string;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const ringIdle = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(60,60,67,0.28)';
  const cardBorderIdle = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(60,60,67,0.14)';

  return (
      <Animated.View style={[styles.methodCardWrap, animStyle]}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityRole="radio"
          accessibilityState={{ selected }}
          accessibilityLabel={title}
        >
          <BlurView
            intensity={isDark ? BlurIntensity.medium : BlurIntensity.light}
            tint={isDark ? 'dark' : 'light'}
            style={[
              styles.methodCard,
              { borderColor: selected ? accentColor : cardBorderIdle },
            ]}
          >
            <LinearGradient
              colors={
                selected
                  ? [`${accentColor}28`, `${accentColor}0c`]
                  : isDark
                    ? ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']
                    : ['rgba(255,255,255,0.75)', 'rgba(255,255,255,0.45)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.methodCardInner}
            >
              <View style={[styles.methodSelectRing, { borderColor: selected ? accentColor : ringIdle }]}>
                {selected && <View style={[styles.methodSelectDot, { backgroundColor: accentColor }]} />}
              </View>

              <View style={[styles.methodIconBg, { backgroundColor: `${accentColor}22` }]}>
                <Ionicons name={iconName} size={26} color={accentColor} />
              </View>
              <View style={styles.methodTextWrap}>
                <Text style={[styles.methodTitle, { color: selected ? accentColor : textColor }]}>{title}</Text>
                <Text style={[styles.methodSubtitle, { color: subtextColor }]}>{subtitle}</Text>
              </View>
            </LinearGradient>
          </BlurView>
        </Pressable>
      </Animated.View>
  );
}

const PaymentGatewayScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<ScreenRoute>();
  const insets = useSafeAreaInsets();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const C = isDark ? DarkColors : LightColors;
  const { t } = useTranslation();

  const { items: cartItems, clearCart } = useCart();
  const personalCart = usePersonalCartOptional();
  const auth = useAuthOptional();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { emitSessionEnd } = useSocket();

  const routeItems = route.params && 'items' in (route.params ?? {}) ? (route.params as any).items : undefined;
  const routeTotal = route.params && 'totalAmount' in (route.params ?? {}) ? (route.params as any).totalAmount : undefined;
  const titleOverride: string | undefined =
    route.params && 'title' in (route.params ?? {}) ? (route.params as any).title : undefined;
  const sharedSessionId: string | undefined =
    route.params && 'sharedSessionId' in (route.params ?? {})
      ? (route.params as { sharedSessionId?: string }).sharedSessionId
      : undefined;

  const useRouteItems = !!(routeItems && routeItems.length > 0);
  const usePersonal = !useRouteItems && !!(personalCart && personalCart.items.length > 0);

  const displayItems = useMemo(() => {
    if (useRouteItems && routeItems)
      return routeItems as Array<{ id: string; name: string; price: number; quantity: number }>;
    if (usePersonal && personalCart)
      return personalCart.items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity }));
    return cartItems.map((i) => ({ id: i.productId, name: i.name, price: i.price, quantity: i.quantity }));
  }, [useRouteItems, routeItems, usePersonal, personalCart, cartItems]);

  const total = useMemo(() => {
    if (typeof routeTotal === 'number' && Number.isFinite(routeTotal)) return routeTotal;
    return displayItems.reduce((s, i) => s + i.price * i.quantity, 0);
  }, [routeTotal, displayItems]);

  const zoomBalance = Number((auth?.userProfile as { loyaltyPoints?: number } | undefined)?.loyaltyPoints ?? 0);
  const maxRedeem = useMemo(() => maxRedeemableZoomPoints(zoomBalance, total), [zoomBalance, total]);

  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  useEffect(() => {
    setPointsToRedeem((prev) => Math.min(Math.max(0, prev), maxRedeemableZoomPoints(zoomBalance, total)));
  }, [zoomBalance, total]);

  const redeemed = Math.min(Math.max(0, Math.floor(pointsToRedeem)), maxRedeem);
  const payable = useMemo(() => payableAfterZoomPoints(total, redeemed), [total, redeemed]);

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [processingStripe, setProcessingStripe] = useState(false);

  const bgColors = useMemo<[string, string, string]>(
    () => (isDark ? ['#0A0A0F', '#0D1117', '#0A0E1A'] : ['#EEF2FF', '#F5F0FF', '#EFF6FF']),
    [isDark],
  );
  const orbBlue = isDark ? 'rgba(0,122,255,0.18)' : 'rgba(0,122,255,0.10)';
  const orbPurple = isDark ? 'rgba(175,82,222,0.14)' : 'rgba(175,82,222,0.08)';
  const orbTeal = isDark ? 'rgba(50,215,175,0.10)' : 'rgba(50,215,175,0.07)';

  const headerSubtitle =
    displayItems.length === 1
      ? t('payment.subtitle_one', { amount: formatLkr(total) })
      : t('payment.subtitle_other', { count: displayItems.length, amount: formatLkr(total) });

  const handleConfirm = useCallback(async () => {
    if (!selectedMethod) return;

    const runClearCarts = () => {
      if (titleOverride === SHARED_SESSION_PAYMENT_TITLE || useRouteItems) {
        personalCart?.clearCart();
        clearCart();
      } else if (usePersonal && personalCart) {
        personalCart.clearCart();
      } else {
        clearCart();
      }
    };

    const finishSharedCheckoutIfNeeded = async () => {
      if (!sharedSessionId || titleOverride !== SHARED_SESSION_PAYMENT_TITLE) return;
      await markSharedSessionEndedLocally(sharedSessionId);
      emitSessionEnd(sharedSessionId);
    };

    const persistPersonalHistory = (paymentId: string) => {
      if (titleOverride === SHARED_SESSION_PAYMENT_TITLE) return;
      const uid = auth?.currentUser?.id ?? auth?.userProfile?.id;
      const itemQtySum = displayItems.reduce((s, i) => s + i.quantity, 0);
      void appendPersonalCheckoutRecord({
        paymentId,
        userId: uid,
        totalAmount: payable,
        itemCount: itemQtySum,
        title: titleOverride ?? t('payment.checkout_fallback'),
        items: displayItems.map((i) => ({
          name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
      }).catch(() => {});
    };

    const finishSuccess = async (
      paymentId: string,
      orderId: string,
      customer: { name: string; email: string; phone: string } | null,
    ) => {
      await auth?.refreshProfile?.();
      const earned = calculateEarnedPoints(payable);
      if (earned > 0) {
        const msg = t('payment.zoompoints_earned', { points: earned });
        if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.LONG);
        else Alert.alert(t('payment.zoompoints_title'), msg);
      }
      navigation.navigate('PaymentSuccess', {
        paymentId,
        orderId,
        amount: payable,
        customer,
        items: displayItems.map((i) => ({
          name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
        orderSubtotal: total,
        loyaltyPointsRedeemed: redeemed,
        ...(sharedSessionId && titleOverride === SHARED_SESSION_PAYMENT_TITLE
          ? { sharedSessionId }
          : {}),
      });
    };

    if (selectedMethod === 'qr') {
      if (payable <= 0.001) {
        try {
          const created = await createPaymentFromItems(displayItems, payable, 'qr', {
            loyaltyPointsRedeemed: redeemed,
          });
          const z = await completeZeroPayment(created.paymentId);
          void deductOrderStock(
            displayItems.map((i) => ({ productId: (i as any).productId ?? i.id, quantity: i.quantity })),
          ).catch(() => {});
          persistPersonalHistory(z.paymentId);
          runClearCarts();
          await finishSharedCheckoutIfNeeded();
          await finishSuccess(z.paymentId, z.orderId, z.customer);
        } catch (err: any) {
          Alert.alert(t('payment.payment_error_title'), err?.message || t('payment.payment_error_generic'));
        }
        return;
      }
      navigation.navigate('PaymentQR', {
        items: displayItems,
        totalAmount: payable,
        orderSubtotal: total,
        loyaltyPointsRedeemed: redeemed,
        title: titleOverride ?? t('payment.total_fallback'),
        ...(sharedSessionId ? { sharedSessionId } : {}),
      });
      return;
    }

    setProcessingStripe(true);
    try {
      if (payable <= 0.001) {
        const created = await createPaymentFromItems(displayItems, payable, 'card', {
          loyaltyPointsRedeemed: redeemed,
        });
        const z = await completeZeroPayment(created.paymentId);
        void deductOrderStock(
          displayItems.map((i) => ({ productId: (i as any).productId ?? i.id, quantity: i.quantity })),
        ).catch(() => {});
        persistPersonalHistory(z.paymentId);
        runClearCarts();
        await finishSharedCheckoutIfNeeded();
        await finishSuccess(z.paymentId, z.orderId, z.customer);
        return;
      }

      const { clientSecret, paymentId } = await createPaymentFromItems(displayItems, payable, 'card', {
        loyaltyPointsRedeemed: redeemed,
      });
      if (!clientSecret) throw new Error(t('payment.stripe_init_failed'));

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'ZoomCart',
        paymentIntentClientSecret: clientSecret,
        returnURL: 'zoomcart://stripe-redirect',
      });

      if (initError) {
        Alert.alert(t('payment.init_failed_title'), initError.message);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert(t('payment.payment_failed_title'), presentError.message);
        }
      } else {
        const res = await verifyStripePayment(paymentId);
        if (!res.success) {
          Alert.alert(
            t('payment.payment_failed_title'),
            res.message ?? res.stripeStatus ?? 'Payment could not be confirmed.',
          );
          return;
        }

        void deductOrderStock(
          displayItems.map((i) => ({ productId: (i as any).productId ?? i.id, quantity: i.quantity })),
        ).catch(() => {});

        if (titleOverride !== SHARED_SESSION_PAYMENT_TITLE) {
          persistPersonalHistory(paymentId);
        }

        runClearCarts();

        await finishSharedCheckoutIfNeeded();

        await finishSuccess(paymentId, res.orderId || 'N/A', res.customer ?? null);
      }
    } catch (err: any) {
      Alert.alert(t('payment.payment_error_title'), err.message || t('payment.payment_error_generic'));
    } finally {
      setProcessingStripe(false);
    }
  }, [
    selectedMethod,
    navigation,
    displayItems,
    total,
    payable,
    redeemed,
    titleOverride,
    sharedSessionId,
    emitSessionEnd,
    initPaymentSheet,
    presentPaymentSheet,
    useRouteItems,
    usePersonal,
    clearCart,
    personalCart,
    auth,
    t,
  ]);

  const dividerColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(60,60,67,0.12)';

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 0 }]}>
        <Animated.View entering={FadeInDown.duration(320)} style={StyleSheet.absoluteFill}>
          <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <FloatingOrb size={240} color={orbBlue} top={-90} left={-60} driftX={[0, 10]} driftY={[0, 8]} duration={7200} />
          <FloatingOrb
            size={200}
            color={orbPurple}
            top={320}
            right={-50}
            driftX={[0, -8]}
            driftY={[0, 10]}
            duration={8000}
          />
          <FloatingOrb size={160} color={orbTeal} top={120} right={-30} driftX={[0, 6]} driftY={[0, -8]} duration={7600} />
        </Animated.View>
      </View>

      <KeyboardAvoidingView style={[styles.flex, { zIndex: 1 }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + Spacing.sm,
              paddingBottom: Math.max(insets.bottom, Spacing.xl) + Spacing.lg,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <SharedCartHeader
            onBack={() => navigation.goBack()}
            kicker={t('payment.checkout_kicker')}
            title={t('payment.payment_title')}
            subtitle={headerSubtitle}
          />

          <Animated.View entering={FadeInDown.delay(50).duration(300)}>
            <GlassCard style={styles.summaryCard} padding={Spacing.lg}>
              <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>{t('payment.order_summary')}</Text>
              {displayItems.map((item, i) => (
                <View key={`${item.id}-${i}`} style={styles.orderRow}>
                  <View style={styles.orderLeft}>
                    <Text style={[styles.orderName, { color: C.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.orderMeta, { color: C.textTertiary }]}>
                      {formatLkr(item.price)} × {item.quantity}
                    </Text>
                  </View>
                  <Text style={[styles.orderTotal, { color: Colors.accent.primary }]}>{formatLkr(item.price * item.quantity)}</Text>
                </View>
              ))}
              <View style={[styles.divider, { backgroundColor: dividerColor }]} />
              <View style={styles.orderRow}>
                <Text style={[styles.orderName, { color: C.text }]}>{t('payment.order_subtotal')}</Text>
                <Text style={[styles.orderTotal, { color: C.textSecondary }]}>{formatLkr(total)}</Text>
              </View>
              {redeemed > 0 ? (
                <View style={[styles.orderRow, { marginTop: Spacing.xs }]}>
                  <Text style={[styles.orderName, { color: C.text }]}>{t('payment.zoompoints_redeem_line')}</Text>
                  <Text style={[styles.orderTotal, { color: Colors.accent.green }]}>−{formatLkr(redeemed)}</Text>
                </View>
              ) : null}
              <View style={[styles.divider, { backgroundColor: dividerColor }]} />
              <View style={styles.grandTotalRow}>
                <Text style={[styles.grandTotalLabel, { color: C.text }]}>
                  {titleOverride ?? t('payment.payable_total')}
                </Text>
                <Text style={[styles.grandTotalValue, { color: Colors.accent.primary }]}>{formatLkr(payable)}</Text>
              </View>
            </GlassCard>
          </Animated.View>

          {auth?.userProfile != null && zoomBalance > 0 ? (
            <Animated.View entering={FadeInDown.delay(80).duration(300)}>
              <GlassCard style={[styles.summaryCard, styles.redeemCard]} padding={Spacing.lg}>
                <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>{t('payment.redeem_section_title')}</Text>
                <Text style={[styles.redeemBalance, { color: C.text }]}>
                  {t('payment.redeem_balance', { points: Math.round(zoomBalance).toLocaleString() })}
                </Text>
                <Text style={[styles.redeemHint, { color: C.textTertiary }]}>{t('payment.redeem_hint')}</Text>
                <View style={styles.redeemRow}>
                  <Text style={[styles.redeemLabel, { color: C.textSecondary }]}>{t('payment.redeem_input_label')}</Text>
                  <TextInput
                    value={String(pointsToRedeem)}
                    onChangeText={(txt) => {
                      const digits = txt.replace(/\D/g, '');
                      if (!digits) {
                        setPointsToRedeem(0);
                        return;
                      }
                      const n = parseInt(digits, 10);
                      setPointsToRedeem(Math.min(n, maxRedeem));
                    }}
                    keyboardType="number-pad"
                    style={[styles.redeemInput, { color: C.text, borderColor: dividerColor }]}
                    placeholder="0"
                    placeholderTextColor={C.textTertiary}
                  />
                  <Pressable
                    onPress={() => setPointsToRedeem(maxRedeem)}
                    style={({ pressed }) => [styles.maxBtn, { opacity: pressed ? 0.85 : 1 }]}
                  >
                    <Text style={styles.maxBtnText}>{t('payment.redeem_use_max')}</Text>
                  </Pressable>
                </View>
                {maxRedeem === 0 ? (
                  <Text style={[styles.redeemWarn, { color: C.textSecondary }]}>{t('payment.redeem_none_for_order')}</Text>
                ) : null}
              </GlassCard>
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInDown.delay(100).duration(320)}>
            <Text style={[styles.sectionLabel, { color: C.textSecondary, marginTop: Spacing.lg }]}>
              {t('payment.payment_method')}
            </Text>
            <View style={styles.methodsGrid}>
              <MethodCard
                iconName="gift-outline"
                title={t('payment.redeem_method_title')}
                subtitle={t('payment.redeem_method_sub')}
                selected={selectedMethod === 'qr'}
                onPress={() => setSelectedMethod('qr')}
                accentColor={Colors.accent.neon}
                isDark={isDark}
                textColor={C.text}
                subtextColor={C.textSecondary}
              />
              <MethodCard
                iconName="card-outline"
                title={t('payment.card_title_short')}
                subtitle={t('payment.card_sub')}
                selected={selectedMethod === 'card'}
                onPress={() => setSelectedMethod('card')}
                accentColor={Colors.accent.primary}
                isDark={isDark}
                textColor={C.text}
                subtextColor={C.textSecondary}
              />
            </View>

            <GlassButton
              title={processingStripe ? t('payment.processing') : t('payment.confirm_pay')}
              onPress={() => void handleConfirm()}
              variant="fill"
              size="lg"
              disabled={!selectedMethod || processingStripe}
              style={
                !selectedMethod || processingStripe
                  ? { ...styles.confirmBtn, ...styles.confirmBtnDisabled }
                  : styles.confirmBtn
              }
            />
          </Animated.View>

          <View style={{ paddingTop: Spacing.xl }}>
            <AppFooter />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default PaymentGatewayScreen;

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  orb: { position: 'absolute' },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  summaryCard: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  redeemCard: {
    marginTop: Spacing.md,
  },
  redeemBalance: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
    marginBottom: Spacing.xs,
  },
  redeemHint: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.xs,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  redeemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  redeemLabel: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    width: '100%',
    marginBottom: Spacing.xs,
  },
  redeemInput: {
    minWidth: 72,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.lg,
  },
  maxBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(0,122,255,0.15)',
  },
  maxBtnText: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.sm,
    color: Colors.accent.primary,
  },
  redeemWarn: {
    marginTop: Spacing.sm,
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.xs,
  },
  sectionLabel: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.sm,
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  orderLeft: { flex: 1, paddingRight: Spacing.md },
  orderName: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.sm,
  },
  orderMeta: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  orderTotal: {
    fontFamily: Typography.fonts.accentBold,
    fontSize: Typography.sizes.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.md,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandTotalLabel: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.lg,
  },
  grandTotalValue: {
    fontFamily: Typography.fonts.accentBold,
    fontSize: Typography.sizes['2xl'],
  },
  methodsGrid: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  methodCardWrap: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  methodCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  methodCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  methodSelectRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodSelectDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  methodIconBg: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodTextWrap: { flex: 1 },
  methodTitle: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
    marginBottom: 2,
  },
  methodSubtitle: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.xs,
  },
  confirmBtn: { width: '100%', marginTop: Spacing.sm },
  confirmBtnDisabled: { opacity: 0.45 },
});
