import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useResolvedTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigationProp } from '../types/navigation';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import { useBudget } from '../context/BudgetContext';
import { usePersonalCartOptional } from '../context/PersonalCartContext';
import BudgetInputCard from '../components/budget/BudgetInputCard';
import BudgetSummaryCard from '../components/budget/BudgetSummaryCard';
import SharedCartHeader from '../components/sharedCart/SharedCartHeader';
import GlassButton from '../components/GlassButton';
import GlassCard from '../components/GlassCard';
import AppFooter from '../components/AppFooter';
import { formatLkr } from '../lib/utils/currency';
import { useTranslation } from 'react-i18next';

function parseBudget(text: string) {
  const cleaned = text.replace(/[^\d.]/g, '');
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return 0;
  return n;
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

export default function BudgetLimiterScreen() {
  const navigation = useNavigation<RootStackNavigationProp<'BudgetLimiter'>>();
  const insets = useSafeAreaInsets();
  const { isDark, colors: C } = useResolvedTheme();
  const { t } = useTranslation();

  const bgColors = useMemo<[string, string, string]>(
    () => (isDark ? ['#0A0A0F', '#0D1117', '#0A0E1A'] : ['#EEF2FF', '#F5F0FF', '#EFF6FF']),
    [isDark],
  );
  const orbBlue = isDark ? 'rgba(0,122,255,0.18)' : 'rgba(0,122,255,0.10)';
  const orbPurple = isDark ? 'rgba(175,82,222,0.14)' : 'rgba(175,82,222,0.08)';
  const orbTeal = isDark ? 'rgba(50,215,175,0.10)' : 'rgba(50,215,175,0.07)';

  const budget = useBudget();
  const personalCart = usePersonalCartOptional();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const amount = useMemo(() => parseBudget(input), [input]);
  const preview = useMemo(() => t('budget.formatted_preview', { amount: formatLkr(amount) }), [amount, t]);

  const cartItems = personalCart?.items ?? [];
  const cartTotal = personalCart?.total ?? 0;
  const hasItems = cartItems.length > 0;

  const headerSubtitle = budget.isActive
    ? t('budget.subtitle_active', { spent: formatLkr(budget.currentSpent), total: formatLkr(budget.budget) })
    : t('budget.subtitle_inactive');

  const onStart = () => {
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(t('budget.err_positive'));
      return;
    }
    setError(null);
    budget.startBudget(amount);
    navigation.navigate('ProductScan');
  };

  const onProceedToPayment = () => {
    if (!hasItems) return;
    navigation.navigate('PaymentGateway', {
      items: cartItems.map((it) => ({
        id: it.id,
        productId: it.id,
        name: it.name,
        price: it.price,
        quantity: it.quantity })),
      totalAmount: cartTotal,
      title: t('budget.payment_title') });
  };

  const onResetSession = () => {
    Alert.alert(
      t('budget.reset_title'),
      t('budget.reset_body'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('budget.reset_confirm'),
          style: 'destructive',
          onPress: () => {
            budget.resetBudget();
            personalCart?.clearCart();
            setInput('');
          } },
      ],
    );
  };

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

      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.body, { paddingTop: insets.top, paddingHorizontal: Spacing.lg }]}>
          <SharedCartHeader
            onBack={() => navigation.goBack()}
            kicker={t('budget.kicker')}
            title={t('budget.title')}
            subtitle={headerSubtitle}
          />

          <Animated.View entering={FadeInDown.delay(40).duration(300)}>
            <BudgetInputCard
              value={input}
              onChangeText={(t) => {
                setInput(t);
                if (error) setError(null);
              }}
              formattedPreview={preview}
              error={error}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(70).duration(300)}>
            <BudgetSummaryCard
              budget={budget.budget}
              currentSpent={budget.currentSpent}
              remaining={budget.remaining}
              progress={budget.progress}
              isActive={budget.isActive}
            />
          </Animated.View>

          {budget.isActive && (
            <Animated.View entering={FadeInDown.delay(100).duration(300)}>
              <GlassCard style={styles.sessionCard} padding={Spacing.lg}>
                <View style={styles.sessionRow}>
                  <Text style={[styles.sessionLabel, { color: C.textSecondary }]}>
                    {hasItems
                      ? t('budget.items_scanned', { count: cartItems.length })
                      : t('budget.no_items')}
                  </Text>
                  {hasItems && (
                    <Text style={[styles.sessionTotal, { color: Colors.accent.primary }]}>{formatLkr(cartTotal)}</Text>
                  )}
                </View>
                <GlassButton
                  title={t('budget.proceed_pay')}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onProceedToPayment();
                  }}
                  variant="fill"
                  size="lg"
                  disabled={!hasItems}
                  style={styles.payBtn}
                  accessibilityLabel={t('budget.proceed_pay_a11y')}
                />
                <GlassButton
                  title={t('budget.continue_scan')}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    navigation.navigate('ProductScan');
                  }}
                  variant="outline"
                  size="md"
                  style={styles.continueBtn}
                  icon={<Ionicons name="scan-outline" size={20} color={Colors.accent.primary} />}
                  accessibilityLabel={t('budget.continue_scan_a11y')}
                />
              </GlassCard>
            </Animated.View>
          )}

          <View style={styles.actions}>
            {!budget.isActive && (
              <GlassButton
                title={t('budget.start_shopping')}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onStart();
                }}
                variant="fill"
                size="lg"
                icon={<Ionicons name="bag-outline" size={20} color="#FFFFFF" />}
                accessibilityLabel={t('budget.start_shopping_a11y')}
              />
            )}
            {budget.isActive && (
              <GlassButton
                title={t('budget.reset_session')}
                onPress={onResetSession}
                variant="ghost"
                size="md"
                style={styles.resetBtn}
                accessibilityLabel={t('budget.reset_session_a11y')}
              />
            )}
          </View>

          <View style={{ paddingBottom: Math.max(insets.bottom, Spacing.md) }}>
            <AppFooter />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  orb: { position: 'absolute' },
  keyboard: { flex: 1 },
  body: { flex: 1 },
  sessionCard: {
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.md,
    gap: Spacing.sm },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs },
  sessionLabel: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm },
  sessionTotal: {
    fontFamily: Typography.fonts.accentBold,
    fontSize: Typography.sizes.lg },
  payBtn: { width: '100%' },
  continueBtn: { width: '100%' },
  actions: {
    marginTop: Spacing.lg,
    gap: Spacing.sm },
  resetBtn: {
    alignSelf: 'flex-start' } });
