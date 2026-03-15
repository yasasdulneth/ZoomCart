import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import { useResolvedTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  FadeInDown,
  FadeIn,
  ZoomIn,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import type { RootStackParamList } from '../types/navigation';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { formatLkr } from '../lib/utils/currency';
import GlassButton from '../components/GlassButton';
import AppFooter from '../components/AppFooter';
import { sharePaymentReceiptPdf } from '../lib/receipt/paymentReceiptPdf';
import { useAuthOptional } from '../context/AuthContext';
import { playPaymentSuccessChime } from '../lib/sounds/uiChimes';
import { suppressSharedSessionForLiveUi } from '../lib/services/sharedSession.service';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

// ─── Confetti particle ───────────────────────────────────────────────────────

const CONFETTI_COLORS = ['#007AFF', '#34C759', '#FF9F0A', '#FF3B30', '#AF52DE', '#5856D6'];

function ConfettiParticle({ index }: { index: number }) {
  const x = useSharedValue(width * 0.5);
  const y = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];

  useEffect(() => {
    const angle = (Math.PI * 2 * index) / 20;
    const dist = 80 + Math.random() * 140;
    x.value = withDelay(index * 30, withSpring(Math.cos(angle) * dist, { damping: 10, stiffness: 80 }));
    y.value = withDelay(index * 30, withSpring(Math.sin(angle) * dist + 200, { damping: 10, stiffness: 60 }));
    rotate.value = withDelay(index * 30, withTiming(360 * (Math.random() > 0.5 ? 1 : -1), { duration: 1200 }));
    opacity.value = withDelay(600 + index * 20, withTiming(0, { duration: 800 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
    position: 'absolute',
    left: width * 0.5 - 5,
    top: 100,
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: color }));

  return <Animated.View style={style} />;
}

// ─── Main screen ─────────────────────────────────────────────────────────────

const PaymentSuccessScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'PaymentSuccess'>>();
  const { isDark, colors: C } = useResolvedTheme();
  const { t } = useTranslation();

  const {
    paymentId,
    orderId,
    amount,
    customer,
    items: receiptItems,
    orderSubtotal: orderSubtotalParam,
    loyaltyPointsRedeemed: loyaltyRedeemedParam,
    sharedSessionId,
  } = route.params;
  const orderSubtotal = orderSubtotalParam ?? amount;
  const loyaltyPointsRedeemed = loyaltyRedeemedParam ?? 0;
  const auth = useAuthOptional();
  const [pdfLoading, setPdfLoading] = useState(false);

  const paidAtIso = useMemo(() => new Date().toISOString(), []);

  const profileZoomPoints = Number(
    (auth?.userProfile as { loyaltyPoints?: number } | undefined)?.loyaltyPoints ?? NaN,
  );

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    void playPaymentSuccessChime();
    if (sharedSessionId) {
      void suppressSharedSessionForLiveUi(sharedSessionId);
    }
  }, [sharedSessionId]);

  const qrData = useMemo(() => JSON.stringify({
    orderId, paymentId, amount,
    orderSubtotal,
    loyaltyPointsRedeemed,
    customer: {
      name: customer?.name || 'Customer',
      phone: customer?.phone || 'N/A',
      email: customer?.email || 'N/A' },
    timestamp: Date.now(),
    type: 'VERIFIED_RECEIPT' }), [orderId, paymentId, amount, orderSubtotal, loyaltyPointsRedeemed, customer]);

  const handleSharePdf = async () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      await sharePaymentReceiptPdf({
        paymentId,
        orderId,
        amount,
        customerName: customer?.name?.trim() || 'Customer',
        customerPhone: customer?.phone?.trim() || '—',
        customerEmail: customer?.email?.trim() || '—',
        paidAtIso,
        items: receiptItems ?? [],
        profileZoomPoints: Number.isFinite(profileZoomPoints) ? profileZoomPoints : undefined,
        orderSubtotal,
        loyaltyPointsRedeemed,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert(
        'Could not create PDF',
        e instanceof Error ? e.message : 'Please try again.',
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setPdfLoading(false);
    }
  };

  const bgColors: [string, string, string] = isDark
    ? ['#001A0A', '#000000', '#001A0A']
    : ['#E8FFF0', '#F2F2F7', '#E8FFF0'];

  return (
    <LinearGradient colors={bgColors} style={styles.container}>
      {/* Confetti burst */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Array.from({ length: 20 }).map((_, i) => (
          <ConfettiParticle key={i} index={i} />
        ))}
      </View>

      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Success icon */}
          <Animated.View entering={ZoomIn.springify().damping(14).stiffness(180)} style={styles.successWrap}>
            <LinearGradient
              colors={['#34C759', '#30D158']}
              style={styles.successCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.checkmark}>✓</Text>
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(180).duration(400)}>
            <Text style={[styles.successTitle, { color: C.text }]}>Payment Successful</Text>
            <Text style={[styles.successSub, { color: C.textSecondary }]}>
              Thank you for shopping with ZoomCart
            </Text>
          </Animated.View>

          {/* Amount hero */}
          <Animated.View entering={FadeInDown.delay(280).duration(400)} style={styles.amountWrap}>
            <Text style={[styles.amountLabel, { color: C.textSecondary }]}>
              {loyaltyPointsRedeemed > 0 ? t('payment.success_payable_heading') : t('payment.amount_paid_simple')}
            </Text>
            <Text style={[styles.amountValue, { color: Colors.accent.green }]}>
              {formatLkr(amount)}
            </Text>
          </Animated.View>

          {loyaltyPointsRedeemed > 0 ? (
            <Animated.View entering={FadeInDown.delay(310).duration(400)} style={styles.redeemRecap}>
              <Text style={[styles.redeemRecapLine, { color: C.textSecondary }]}>
                {t('payment.order_subtotal')}: <Text style={{ color: C.text }}>{formatLkr(orderSubtotal)}</Text>
              </Text>
              <Text style={[styles.redeemRecapLine, { color: C.textSecondary }]}>
                {t('payment.zoompoints_redeem_line')}:{' '}
                <Text style={{ color: Colors.accent.green }}>−{formatLkr(loyaltyPointsRedeemed)}</Text>
                {' · '}
                {loyaltyPointsRedeemed.toLocaleString()} pts
              </Text>
            </Animated.View>
          ) : null}

          {/* Receipt card */}
          <Animated.View
            entering={FadeInDown.delay(360).duration(440)}
            style={[
              styles.receiptCard,
              {
                backgroundColor: isDark ? 'rgba(28,28,30,0.88)' : 'rgba(255,255,255,0.88)',
                borderColor: C.border,
                ...Shadows.md },
            ]}
          >
            <Text style={[styles.receiptLabel, { color: C.textSecondary }]}>Transaction Receipt</Text>

            {/* QR */}
            <View style={styles.qrWrap}>
              <View style={styles.qrInner}>
                <QRCode value={qrData} size={width * 0.52} color="#000000" backgroundColor="transparent" />
              </View>
              <Text style={[styles.qrHint, { color: C.textTertiary }]}>
                Show at exit for verification
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: C.borderSubtle }]} />

            {/* Details */}
            <View style={styles.detailsWrap}>
              {loyaltyPointsRedeemed > 0 ? (
                <>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: C.textSecondary }]}>{t('payment.order_subtotal')}</Text>
                    <Text style={[styles.detailValue, { color: C.text }]}>{formatLkr(orderSubtotal)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: C.textSecondary }]}>
                      {t('payment.zoompoints_redeem_line')}
                    </Text>
                    <Text style={[styles.detailValue, { color: C.text }]} numberOfLines={2}>
                      −{formatLkr(loyaltyPointsRedeemed)} ({loyaltyPointsRedeemed.toLocaleString()} pts)
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: C.textSecondary }]}>{t('payment.payable_total')}</Text>
                    <Text style={[styles.detailValue, { color: C.text }]}>{formatLkr(amount)}</Text>
                  </View>
                </>
              ) : null}
              {[
                { label: 'Order ID', value: orderId },
                { label: 'Customer', value: customer?.name ?? '—' },
                { label: 'Phone', value: customer?.phone ?? '—' },
                { label: 'Email', value: customer?.email ?? '—' },
              ].map(({ label, value }) => (
                <View key={label} style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: C.textSecondary }]}>{label}</Text>
                  <Text style={[styles.detailValue, { color: C.text }]} numberOfLines={1}>
                    {value}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Actions */}
          <Animated.View entering={FadeInDown.delay(440).duration(400)} style={styles.actions}>
            <GlassButton
              title="Back to Home"
              onPress={() => (navigation.navigate as any)('Home')}
              variant="fill"
              size="lg"
              style={styles.homeBtn}
              accessibilityLabel="Go back to home"
            />
            <GlassButton
              title={pdfLoading ? 'Preparing PDF…' : 'Share Receipt (PDF)'}
              onPress={() => void handleSharePdf()}
              variant="outline"
              size="lg"
              loading={pdfLoading}
              disabled={pdfLoading}
              style={styles.sharePdfBtn}
              accessibilityLabel="Share receipt as PDF file"
            />
          </Animated.View>

          <AppFooter />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    padding: Spacing.lg,
    paddingTop: Spacing['2xl'],
    alignItems: 'center' },
  successWrap: {
    marginBottom: Spacing.lg,
    ...Shadows.accent },
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12 },
  checkmark: {
    fontSize: 44,
    color: '#FFFFFF',
    fontWeight: '700' },
  successTitle: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: 28,
    letterSpacing: 0.36,
    textAlign: 'center',
    marginBottom: 6 },
  successSub: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 15,
    letterSpacing: -0.24,
    textAlign: 'center',
    marginBottom: Spacing.lg },
  amountWrap: {
    alignItems: 'center',
    marginBottom: Spacing.lg },
  redeemRecap: {
    width: '100%',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs },
  redeemRecapLine: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20 },
  amountLabel: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4 },
  amountValue: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: 40,
    letterSpacing: 0.37 },
  receiptCard: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg },
  receiptLabel: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: Spacing.lg },
  qrWrap: { alignItems: 'center', marginBottom: Spacing.lg },
  qrInner: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4 },
  qrHint: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 12,
    marginTop: Spacing.sm,
    textAlign: 'center',
    letterSpacing: -0.08 },
  divider: { height: 1, marginVertical: Spacing.md },
  detailsWrap: { gap: Spacing.sm },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center' },
  detailLabel: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 14,
    letterSpacing: -0.08 },
  detailValue: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: 14,
    letterSpacing: -0.08,
    maxWidth: '55%',
    textAlign: 'right' },
  actions: { width: '100%', gap: Spacing.sm },
  homeBtn: { width: '100%' },
  sharePdfBtn: { width: '100%' } });

export default PaymentSuccessScreen;
