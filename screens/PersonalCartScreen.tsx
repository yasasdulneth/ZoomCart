import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ListRenderItem,
} from 'react-native';
import { useResolvedTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeIn,
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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import type { PersonalCartItem } from '../context/PersonalCartContext';
import { usePersonalCart } from '../context/PersonalCartContext';
import { useBudgetOptional } from '../context/BudgetContext';
import { Typography, Spacing, BorderRadius, Colors } from '../constants/theme';
import PersonalCartHeader from '../components/personalCart/PersonalCartHeader';
import CartItemCard from '../components/personalCart/CartItemCard';
import CartSummaryCard from '../components/personalCart/CartSummaryCard';
import CheckoutButton from '../components/personalCart/CheckoutButton';
import GlassButton from '../components/GlassButton';
import GlassCard from '../components/GlassCard';
import GlassBadge from '../components/GlassBadge';
import AppFooter from '../components/AppFooter';
import { formatLkr } from '../lib/utils/currency';
import { useTranslation } from 'react-i18next';

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

function formatHistoryDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso.slice(0, 10);
  }
}

function formatHistoryTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

const noopRemove = (_id: string) => {};
const noopQty = (_id: string, _qty: number) => {};

export default function PersonalCartScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'PersonalCart'>>();
  const insets = useSafeAreaInsets();
  const { items, removeItem, updateQuantity, subtotal, total } = usePersonalCart();
  const budget = useBudgetOptional();
  const { isDark, colors: C } = useResolvedTheme();
  const { t } = useTranslation();

  const historyReceipt = route.params?.historyReceipt;
  const isHistory = !!historyReceipt;

  const historyItems: PersonalCartItem[] = useMemo(() => {
    if (!historyReceipt?.items?.length) return [];
    return historyReceipt.items.map((it, i) => ({
      id: `hist_${i}_${String(it.name).slice(0, 24)}`,
      name: it.name,
      price: it.price,
      quantity: it.quantity,
      emoji: '🛒',
    }));
  }, [historyReceipt]);

  const listData = isHistory ? historyItems : items;

  const historySubtotal = useMemo(
    () => historyItems.reduce((s, i) => s + i.price * i.quantity, 0),
    [historyItems],
  );
  const historyTotal = historyReceipt?.totalAmount ?? historySubtotal;

  const overBudget =
    !isHistory && !!budget?.isActive && budget.budget > 0 && total > budget.budget;

  const bgColors = useMemo<[string, string, string]>(
    () =>
      isDark
        ? ['#0A0A0F', '#0D1117', '#0A0E1A']
        : ['#EEF2FF', '#F5F0FF', '#EFF6FF'],
    [isDark],
  );

  const orbBlue = isDark ? 'rgba(0,122,255,0.18)' : 'rgba(0,122,255,0.10)';
  const orbPurple = isDark ? 'rgba(175,82,222,0.14)' : 'rgba(175,82,222,0.08)';
  const orbTeal = isDark ? 'rgba(50,215,175,0.10)' : 'rgba(50,215,175,0.07)';

  const keyExtractor = useCallback((item: PersonalCartItem) => item.id, []);

  const renderItem: ListRenderItem<PersonalCartItem> = useCallback(
    ({ item, index }) => (
      <CartItemCard
        item={item}
        index={index}
        onRemove={isHistory ? noopRemove : removeItem}
        onChangeQuantity={isHistory ? noopQty : updateQuantity}
        readOnly={isHistory}
      />
    ),
    [isHistory, removeItem, updateQuantity],
  );

  const receiptDateLine = useMemo(() => {
    if (!historyReceipt) return '';
    const units = historyItems.reduce((s, i) => s + i.quantity, 0);
    const unitLabel =
      units === 1 ? t('cartHeader.item_one') : t('cartHeader.item_other');
    return `${formatHistoryDate(historyReceipt.createdAt)} · ${formatHistoryTime(historyReceipt.createdAt)} · ${units} ${unitLabel}`;
  }, [historyReceipt, historyItems, t]);

  const listHeader = useMemo(
    () => (
      <>
        <PersonalCartHeader
          itemCount={isHistory ? historyItems.length : items.length}
          onBack={() => navigation.goBack()}
          receipt={
            isHistory && historyReceipt
              ? { title: historyReceipt.title, dateLine: receiptDateLine }
              : undefined
          }
        />
        {!isHistory && (
          <>
            <Animated.View entering={FadeInDown.delay(40).duration(300)}>
              <GlassButton
                title={t('personalCart.scan_product')}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate('ProductScan', { closeAfterAdd: true });
                }}
                variant="outline"
                size="md"
                style={styles.scanBtn}
                icon={<Ionicons name="scan-outline" size={20} color={Colors.accent.primary} />}
                accessibilityLabel={t('personalCart.scan_a11y')}
              />
            </Animated.View>
            {budget?.isActive && budget.budget > 0 && (
              <Animated.View entering={FadeInDown.delay(70).duration(300)} style={styles.budgetStrip}>
                <GlassCard style={styles.budgetCard}>
                  <View style={styles.budgetRow}>
                    <GlassBadge label={t('personalCart.budget_on')} variant="success" size="sm" />
                    <Text style={[styles.budgetMeta, { color: C.textSecondary }]}>
                      {formatLkr(budget.currentSpent)} / {formatLkr(budget.budget)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.budgetTrack,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
                    ]}
                  >
                    <View
                      style={[
                        styles.budgetFill,
                        {
                          width: `${Math.min(100, Math.round(budget.progress * 100))}%`,
                          backgroundColor:
                            budget.progress >= 0.95
                              ? Colors.accent.red
                              : budget.progress >= 0.75
                                ? Colors.accent.orange
                                : Colors.accent.green,
                        },
                      ]}
                    />
                  </View>
                </GlassCard>
              </Animated.View>
            )}
          </>
        )}
      </>
    ),
    [
      isHistory,
      historyReceipt,
      historyItems.length,
      receiptDateLine,
      items.length,
      navigation,
      budget,
      C.textSecondary,
      isDark,
      t,
    ],
  );

  const listEmpty = useMemo(() => {
    if (isHistory && historyItems.length === 0) {
      return (
        <Animated.View entering={FadeIn.delay(180).duration(360)} style={styles.emptyWrap}>
          <GlassCard style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="receipt-outline" size={40} color={Colors.accent.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: C.text }]}>{t('personalCart.history_no_lines_title')}</Text>
            <Text style={[styles.emptySub, { color: C.textSecondary }]}>{t('personalCart.history_no_lines_body')}</Text>
            <Text style={[styles.historyTotalMuted, { color: C.text }]}>
              {t('personalCart.history_total_label', { amount: formatLkr(historyTotal) })}
            </Text>
          </GlassCard>
        </Animated.View>
      );
    }
    return (
      <Animated.View entering={FadeIn.delay(180).duration(360)} style={styles.emptyWrap}>
        <GlassCard style={styles.emptyCard}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="cart-outline" size={40} color={Colors.accent.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: C.text }]}>{t('personalCart.empty_title')}</Text>
          <Text style={[styles.emptySub, { color: C.textSecondary }]}>{t('personalCart.empty_sub')}</Text>
          <GlassButton
            title={t('personalCart.start_scanning')}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate('ProductScan', { closeAfterAdd: true });
            }}
            variant="fill"
            size="lg"
            icon={<Ionicons name="scan-outline" size={20} color="#FFFFFF" />}
            accessibilityLabel={t('personalCart.start_scanning_a11y')}
          />
        </GlassCard>
      </Animated.View>
    );
  }, [isHistory, historyItems.length, C.text, C.textSecondary, historyTotal, navigation, t]);

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

      <View style={[styles.body, { paddingTop: insets.top, paddingHorizontal: Spacing.lg }]}>
        <FlatList
          style={styles.list}
          data={listData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom:
                listData.length > 0 ? Spacing.md : Math.max(insets.bottom, Spacing.xl) + 40,
            },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={listEmpty}
        />

        {isHistory ? (
          <View style={{ paddingBottom: Spacing.sm }}>
            <CartSummaryCard
              subtotal={historyItems.length > 0 ? historySubtotal : historyTotal}
              total={historyTotal}
            />
          </View>
        ) : (
          items.length > 0 && (
            <View style={{ paddingBottom: Spacing.sm }}>
              {overBudget && (
                <GlassCard style={[styles.overBudgetCard, { borderColor: 'rgba(255,59,48,0.35)' }]}>
                  <View style={styles.overBudgetInner}>
                    <Ionicons name="alert-circle" size={22} color={Colors.accent.red} />
                    <Text style={styles.overBudgetText}>
                      {t('personalCart.over_budget', { amount: formatLkr(budget!.budget) })}
                    </Text>
                  </View>
                </GlassCard>
              )}
              <CartSummaryCard subtotal={subtotal} total={total} />
              <CheckoutButton
                disabled={items.length === 0 || overBudget}
                onPress={() => navigation.navigate('PaymentGateway')}
              />
            </View>
          )
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
  list: { flex: 1 },
  scanBtn: { width: '100%', marginBottom: Spacing.sm },
  listContent: {
    flexGrow: 1 },
  budgetStrip: {
    marginBottom: Spacing.md },
  budgetCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm },
  budgetMeta: {
    fontFamily: Typography.fonts.secondaryMedium,
    fontSize: Typography.sizes.sm },
  budgetTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden' },
  budgetFill: {
    height: '100%',
    borderRadius: 999 },
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
  historyTotalMuted: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.lg,
    textAlign: 'center',
  },
  overBudgetCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    backgroundColor: 'rgba(255,59,48,0.08)' },
  overBudgetInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm },
  overBudgetText: {
    flex: 1,
    fontFamily: Typography.fonts.secondaryMedium,
    fontSize: Typography.sizes.sm,
    color: Colors.accent.red,
    lineHeight: 20 } });
