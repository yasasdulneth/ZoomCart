import React, { useCallback, useEffect, useMemo, useState, memo } from 'react';
import { View, Text, StyleSheet, FlatList, StatusBar, Pressable } from 'react-native';
import { useResolvedTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import GlassCard from '../components/GlassCard';
import GlassBadge from '../components/GlassBadge';
import GlassButton from '../components/GlassButton';
import { SkeletonCard } from '../components/SkeletonLoader';
import {
  Typography,
  Spacing,
  BorderRadius,
  Colors } from '../constants/theme';
import { formatLkr } from '../lib/utils/currency';
import { useAuthOptional } from '../context/AuthContext';
import {
  listUnifiedShoppingActivity,
  removePersonalCheckoutRecord,
  type PersonalCheckoutRecord,
  type UnifiedShoppingRow } from '../lib/services/personalCheckoutHistory.service';
import { removeSharedSession, getSharedSessionsSuppressedFromLiveUi, type SharedSession } from '../lib/services/sharedSession.service';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { useTranslation } from 'react-i18next';
import SessionSwipeRow from '../components/recentSessions/SessionSwipeRow';

const ACTIVE_MAX_AGE_MS = 2 * 60 * 60 * 1000;

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso.slice(0, 10);
  }
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function canRejoinSharedSession(session: SharedSession): boolean {
  if (session.status !== 'ACTIVE') return false;
  const createdAt = Date.parse(session.createdAt);
  if (!Number.isFinite(createdAt)) return false;
  return Date.now() - createdAt <= ACTIVE_MAX_AGE_MS;
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

  const style = useAnimatedStyle(() => ({
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
        style,
      ]}
    />
  );
}

const SharedHistoryCard = memo(function SharedHistoryCard({
  session,
  currentUserId,
  isDark,
  textColor,
  secondaryColor,
  onPress }: {
  session: SharedSession;
  currentUserId: string;
  isDark: boolean;
  textColor: string;
  secondaryColor: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const isHost = session.hostId === currentUserId;
  const participantCount = session.participants.length;
  const itemCount = session.items.length;
  const lineQty = session.items.reduce((s, i) => s + i.quantity, 0);
  const rejoinable = canRejoinSharedSession(session);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('recentSessions.shared_a11y', { amount: formatLkr(session.totalAmount) })}
      accessibilityHint={rejoinable ? t('recentSessions.shared_hint_live') : t('recentSessions.shared_hint_cart')}
      style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
    >
      <GlassCard style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardTopLeft}>
            <GlassBadge label={t('recentSessions.badge_shared')} variant="accent" size="sm" />
            {isHost ? (
              <View style={[styles.hostPill, { borderColor: isDark ? 'rgba(0,245,255,0.35)' : 'rgba(0,122,255,0.35)' }]}>
                <Text style={[styles.hostPillText, { color: Colors.accent.neon }]}>{t('recentSessions.host')}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.cardAmount, { color: Colors.accent.primary }]}>{formatLkr(session.totalAmount)}</Text>
        </View>

        <Text style={[styles.cardTitle, { color: textColor }]} numberOfLines={1}>
          {t('recentSessions.group_shop')}
        </Text>

        <Text style={[styles.metaLine, { color: secondaryColor }]}>
          {formatDate(session.createdAt)} · {formatTime(session.createdAt)}
        </Text>
        <Text style={[styles.metaLine, { color: secondaryColor }]}>
          {participantCount}{' '}
          {participantCount !== 1 ? t('recentSessions.participants') : t('recentSessions.participant')} · {itemCount}{' '}
          {itemCount !== 1 ? t('recentSessions.lines') : t('recentSessions.line')} · {lineQty}{' '}
          {lineQty !== 1 ? t('recentSessions.units') : t('recentSessions.unit')}
        </Text>

        {session.participants.length > 0 && (
          <View style={styles.participantRow}>
            {session.participants.slice(0, 5).map((p, idx) => (
              <View
                key={`${session.id}-p-${p.userId ?? 'anon'}-${idx}`}
                style={[styles.participantChip, { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }]}
              >
                <Text style={[styles.participantInitial, { color: textColor }]}>
                  {(p.name ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            ))}
            {session.participants.length > 5 ? (
              <Text style={[styles.moreParticipants, { color: secondaryColor }]}>
                +{session.participants.length - 5}
              </Text>
            ) : null}
          </View>
        )}

        {rejoinable ? (
          <View style={styles.footerHint}>
            <Text style={[styles.footerHintText, { color: Colors.accent.primary }]}>
              {t('recentSessions.continue_session')}
            </Text>
          </View>
        ) : (
          <View style={styles.footerHint}>
            <Text style={[styles.footerHintMuted, { color: secondaryColor }]}>{t('recentSessions.start_new_hint')}</Text>
          </View>
        )}
      </GlassCard>
    </Pressable>
  );
});

const PersonalHistoryCard = memo(function PersonalHistoryCard({
  title,
  totalAmount,
  itemCount,
  createdAt,
  isDark,
  textColor,
  secondaryColor,
  onPress }: {
  title: string;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
  isDark: boolean;
  textColor: string;
  secondaryColor: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('recentSessions.personal_a11y', { amount: formatLkr(totalAmount) })}
      accessibilityHint={t('recentSessions.personal_hint_a11y')}
      style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
    >
      <GlassCard style={styles.card}>
        <View style={styles.cardTop}>
          <GlassBadge label={t('recentSessions.badge_personal')} variant="info" size="sm" />
          <Text style={[styles.cardAmount, { color: Colors.accent.primary }]}>{formatLkr(totalAmount)}</Text>
        </View>
        <Text style={[styles.cardTitle, { color: textColor }]} numberOfLines={2}>
          {title}
        </Text>
        <Text style={[styles.metaLine, { color: secondaryColor }]}>
          {formatDate(createdAt)} · {formatTime(createdAt)}
        </Text>
        <Text style={[styles.metaLine, { color: secondaryColor }]}>
          {t('recentSessions.items_scanned', { count: itemCount })}
        </Text>
        <View style={styles.personalIconRow}>
          <View
            style={[
              styles.soloIcon,
              { backgroundColor: isDark ? 'rgba(88,86,214,0.22)' : 'rgba(88,86,214,0.12)' },
            ]}
          >
            <Ionicons name="bag-handle-outline" size={22} color={Colors.accent.secondary} />
          </View>
          <Text style={[styles.footerHintMuted, { color: secondaryColor }]}>{t('recentSessions.tap_cart_hint')}</Text>
        </View>
      </GlassCard>
    </Pressable>
  );
});

export default function RecentSessionsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { isDark, colors: C } = useResolvedTheme();
  const { t } = useTranslation();

  const auth = useAuthOptional();
  const currentUserId = auth?.currentUser?.id ?? auth?.userProfile?.id ?? '';

  const [rows, setRows] = useState<UnifiedShoppingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const load = useCallback(() => {
    setError(null);
    listUnifiedShoppingActivity(currentUserId || undefined)
      .then(setRows)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : t('recentSessions.load_err'));
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [currentUserId, t]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
      return () => {};
    }, [load]),
  );

  const onSharedPress = useCallback(
    (session: SharedSession) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      void (async () => {
        const suppressed = await getSharedSessionsSuppressedFromLiveUi();
        if (suppressed.has(session.id)) {
          navigation.navigate('SharedCart');
          return;
        }
        if (canRejoinSharedSession(session)) {
          navigation.navigate('ActiveSharedSession', { sessionId: session.id });
        } else {
          navigation.navigate('SharedCart');
        }
      })();
    },
    [navigation],
  );

  const onPersonalPress = useCallback(
    (record: PersonalCheckoutRecord) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate('PersonalCart', {
        historyReceipt: {
          title: record.title,
          totalAmount: record.totalAmount,
          createdAt: record.createdAt,
          items: record.items ?? [],
        },
      });
    },
    [navigation],
  );

  const onRemovePersonalRow = useCallback(async (id: string) => {
    await removePersonalCheckoutRecord(id);
    setRows((prev) => prev.filter((r) => !(r.kind === 'personal' && r.record.id === id)));
  }, []);

  const onRemoveSharedRow = useCallback(async (sessionId: string) => {
    await removeSharedSession(sessionId);
    setRows((prev) => prev.filter((r) => !(r.kind === 'shared' && r.session.id === sessionId)));
  }, []);

  const listHeader = useMemo(
    () => (
      <Animated.View entering={FadeInDown.duration(320)} style={[styles.headerBlock, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.kicker, { color: C.textSecondary }]}>{t('recentSessions.kicker')}</Text>
        <Text style={[styles.title, { color: C.text }]}>{t('recentSessions.title')}</Text>
        <Text style={[styles.subtitle, { color: C.textSecondary }]}>{t('recentSessions.subtitle')}</Text>
      </Animated.View>
    ),
    [C.text, C.textSecondary, insets.top, t],
  );

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Animated.View entering={FadeInDown.duration(400)} style={StyleSheet.absoluteFill}>
        <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <FloatingOrb size={260} color={orbBlue} top={-90} left={-70} driftX={[0, 14]} driftY={[0, 10]} duration={7000} />
        <FloatingOrb
          size={220}
          color={orbPurple}
          top={420}
          right={-60}
          driftX={[0, -12]}
          driftY={[0, 14]}
          duration={8200}
        />
        <FloatingOrb size={180} color={orbTeal} top={160} right={-40} driftX={[0, 10]} driftY={[0, -12]} duration={7600} />
        <View pointerEvents="none" style={StyleSheet.absoluteFill} />
      </Animated.View>

      {loading ? (
        <View style={[styles.skeletonWrap, { paddingTop: insets.top + Spacing.xl }]}>
          {listHeader}
          <SkeletonCard lines={3} style={styles.skeletonCard} showAvatar />
          <SkeletonCard lines={3} style={styles.skeletonCard} showAvatar />
          <SkeletonCard lines={2} style={styles.skeletonCard} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) =>
            item.kind === 'shared' ? `shared-${item.session.id}` : `personal-${item.record.id}`
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 120, paddingHorizontal: Spacing.lg },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            error ? (
              <View style={styles.emptyWrap}>
                <GlassCard style={styles.emptyCard}>
                  <Text style={[styles.errorTitle, { color: C.text }]}>{t('recentSessions.err_title')}</Text>
                  <Text style={[styles.errorBody, { color: C.textSecondary }]}>{error}</Text>
                  <GlassButton
                    title={t('recentSessions.try_again')}
                    variant="fill"
                    size="md"
                    onPress={() => {
                      setLoading(true);
                      load();
                    }}
                  />
                </GlassCard>
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <GlassCard style={styles.emptyCard}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="receipt-outline" size={36} color={Colors.accent.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: C.text }]}>{t('recentSessions.empty_title')}</Text>
                  <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>{t('recentSessions.empty_sub')}</Text>
                  <GlassButton
                    title={t('recentSessions.go_shopping')}
                    variant="fill"
                    size="lg"
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      navigation.navigate('Home');
                    }}
                    accessibilityLabel={t('recentSessions.go_home_a11y')}
                  />
                </GlassCard>
              </View>
            )
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.delay(Math.min(index * 40, 240)).duration(320)}
              style={styles.rowWrap}
            >
              <SessionSwipeRow
                onDelete={() =>
                  item.kind === 'shared'
                    ? onRemoveSharedRow(item.session.id)
                    : onRemovePersonalRow(item.record.id)
                }
              >
                {item.kind === 'shared' ? (
                  <SharedHistoryCard
                    session={item.session}
                    currentUserId={currentUserId}
                    isDark={isDark}
                    textColor={C.text}
                    secondaryColor={C.textSecondary}
                    onPress={() => onSharedPress(item.session)}
                  />
                ) : (
                  <PersonalHistoryCard
                    title={item.record.title}
                    totalAmount={item.record.totalAmount}
                    itemCount={item.record.itemCount}
                    createdAt={item.record.createdAt}
                    isDark={isDark}
                    textColor={C.text}
                    secondaryColor={C.textSecondary}
                    onPress={() => onPersonalPress(item.record)}
                  />
                )}
              </SessionSwipeRow>
            </Animated.View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  rowWrap: {
    marginBottom: Spacing.md },
  orb: {
    position: 'absolute' },
  listContent: {
    paddingTop: Spacing.sm },
  skeletonWrap: {
    paddingHorizontal: Spacing.lg },
  skeletonCard: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg },
  headerBlock: {
    marginBottom: Spacing.lg },
  kicker: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
    opacity: 0.85 },
  title: {
    fontFamily: Typography.fonts.accentBold,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.35 },
  subtitle: {
    marginTop: Spacing.xs,
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.base,
    lineHeight: 22 },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm },
  cardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1 },
  hostPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(0,245,255,0.08)' },
  hostPillText: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: 11 },
  cardAmount: {
    fontFamily: Typography.fonts.accentBold,
    fontSize: Typography.sizes.xl,
    fontWeight: '700' },
  cardTitle: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.lg,
    marginBottom: 6 },
  metaLine: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    marginBottom: 2 },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm },
  participantChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(99,102,241,0.2)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center' },
  participantInitial: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: 12 },
  moreParticipants: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 12 },
  footerHint: {
    marginTop: Spacing.md,
    alignItems: 'flex-end' },
  footerHintText: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.sm },
  footerHintMuted: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm },
  personalIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md },
  soloIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center' },
  emptyWrap: {
    paddingTop: Spacing.lg },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    borderRadius: BorderRadius.xl },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(0,122,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md },
  emptyTitle: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.xl,
    marginBottom: Spacing.xs },
  emptySubtitle: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.base,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg },
  errorTitle: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.lg,
    marginBottom: Spacing.xs },
  errorBody: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    marginBottom: Spacing.lg } });
