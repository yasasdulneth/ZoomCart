/**
 * ZoomCart — Premium HomeScreen
 *
 * Liquid-glass morphism, layered ambient orbs, dynamic content driven by
 * AuthContext / PersonalCartContext / BudgetContext / shared sessions.
 * Zero logic changes — same hooks, same navigation targets.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import type { RootStackParamList, RootStackNavigationProp } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import { usePersonalCartOptional } from '../context/PersonalCartContext';
import { useBudgetOptional } from '../context/BudgetContext';
import {
  getSharedSession,
  getSharedSessionsSuppressedFromLiveUi,
  getSharedSessionForegroundParticipation,
  clearSharedSessionForegroundParticipation,
  type SharedSession } from '../lib/services/sharedSession.service';
import { getSavedProfileAvatar } from '../lib/services/localProfileAvatar.service';
import { Colors, Typography, Spacing, BorderRadius, DarkColors, LightColors, Shadows } from '../constants/theme';
import { useResolvedTheme } from '../context/ThemeContext';
import { formatLkr } from '../lib/utils/currency';
import { ZoomCartLogo } from '../components/ZoomCartLogo';
import { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

const H_PADDING = 20;
const CARD_GAP = 14;
/** Tall enough for logo + wordmark + tagline without clipping (fixed row was 64 and cut off the tagline). */
const HEADER_HEIGHT = 84;
const HEADER_SIDE_SLOT = 44;

// ─── Floating Ambient Orb ────────────────────────────────────────────────────

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
        style,
      ]}
    />
  );
}

// ─── Animated Counter ────────────────────────────────────────────────────────

interface CounterProps {
  value: number;
  style?: TextStyle | TextStyle[];
  format?: (n: number) => string;
  durationMs?: number;
}

function AnimatedCounter({ value, style, format, durationMs = 800 }: CounterProps) {
  const displayRef = useRef(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = displayRef.current;
    const delta = value - start;
    if (delta === 0) return;
    let raf = 0;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = start + delta * eased;
      const endVal = t === 1 ? value : next;
      displayRef.current = endVal;
      setDisplay(endVal);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  const text = format ? format(display) : Math.round(display).toLocaleString();
  return <Text style={style}>{text}</Text>;
}

// ─── Pulsing Live Dot ────────────────────────────────────────────────────────

function PulseDot({ color, size = 6 }: { color: string; size?: number }) {
  const opacity = useSharedValue(0.35);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

// ─── Quick Action Card ───────────────────────────────────────────────────────

interface QuickActionProps {
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  iconColors: readonly [string, string];
  tintColor: string;
  badgeText?: string | null;
  badgeColor?: string;
  progress?: number | null; // 0..1
  progressColor?: string;
  onPress: () => void;
  delayMs: number;
  isDark: boolean;
}

function QuickActionCard({
  iconName,
  title,
  subtitle,
  iconColors,
  tintColor,
  badgeText,
  badgeColor,
  progress,
  progressColor,
  onPress,
  delayMs,
  isDark,
}: QuickActionProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const fillW = useSharedValue(0);
  useEffect(() => {
    if (typeof progress === 'number') {
      fillW.value = withDelay(700, withTiming(Math.max(0, Math.min(1, progress)), { duration: 700, easing: Easing.out(Easing.cubic) }));
    }
  }, [progress]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fillW.value * 100}%` }));

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const C = isDark ? DarkColors : LightColors;
  const cardBg = isDark ? 'rgba(28,28,30,0.55)' : 'rgba(255,255,255,0.82)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(60,60,67,0.14)';

  return (
    <Animated.View
      entering={FadeInDown.delay(220 + delayMs).duration(280)}
      style={[styles.gridCell, animStyle]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={() => { scale.value = withTiming(0.98, { duration: 120 }); }}
        onPressOut={() => { scale.value = withTiming(1, { duration: 140 }); }}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${subtitle}`}
        style={styles.qaPressable}
      >
        <View
          style={[
            styles.qaCard,
            {
              backgroundColor: cardBg,
              borderColor: cardBorder,
              ...Shadows.md,
            },
          ]}
        >
          {/* Tint wash */}
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, { backgroundColor: tintColor, borderRadius: 22 }]}
          />
          {/* Top rim highlight */}
          <View
            pointerEvents="none"
            style={[styles.rimHighlight, { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.7)' }]}
          />

          {/* Active badge top right */}
          {!!badgeText && (
            <View style={[styles.qaBadge, { backgroundColor: (badgeColor ?? '#34C759') + '22', borderColor: (badgeColor ?? '#34C759') + '55' }]}>
              <PulseDot color={badgeColor ?? '#34C759'} size={5} />
              <Text style={[styles.qaBadgeText, { color: badgeColor ?? '#34C759' }]}>{badgeText}</Text>
            </View>
          )}

          <View style={styles.qaCardInner}>
            <LinearGradient
              colors={iconColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.qaIcon}
            >
              <Ionicons name={iconName} size={26} color="rgba(255,255,255,0.98)" />
            </LinearGradient>

            <View style={styles.qaSpacer} />

            <Text style={[styles.qaTitle, { color: C.text }]} numberOfLines={1}>
              {title}
            </Text>

            {typeof progress === 'number' ? (
              <View
                style={[
                  styles.qaProgressTrack,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.10)' },
                ]}
              >
                <Animated.View
                  style={[
                    styles.qaProgressFill,
                    fillStyle,
                    { backgroundColor: progressColor ?? Colors.accent.orange },
                  ]}
                />
              </View>
            ) : (
              <Text style={[styles.qaSubtitle, { color: C.textSecondary }]} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>

          <View style={styles.qaArrow} pointerEvents="none">
            <Ionicons name="chevron-forward" size={18} color={C.textSecondary} style={{ opacity: 0.45 }} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Tagline picker ──────────────────────────────────────────────────────────

function pickTagline(opts: {
  hour: number;
  itemCount: number;
  budgetActive: boolean;
  budgetSet: boolean;
  budgetProgress: number; // 0..1
}, t: TFunction): string {
  const { hour, itemCount, budgetActive, budgetSet, budgetProgress } = opts;

  if (itemCount >= 5) return t('home.tagline_big_haul');

  if (itemCount > 0) {
    if (budgetActive) {
      if (budgetProgress >= 0.85) return t('home.tagline_budget_warn');
      return t('home.tagline_on_track');
    }
    if (!budgetSet) return t('home.tagline_set_budget');
    return t('home.tagline_on_track');
  }

  if (hour < 12) return t('home.tagline_morning');
  if (hour < 17) return t('home.tagline_afternoon');
  return t('home.tagline_evening');
}

// ─── Main screen ─────────────────────────────────────────────────────────────

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp<'Home'>>();
  const insets = useSafeAreaInsets();
  const { isDark, colors: C } = useResolvedTheme();
  const { t, i18n } = useTranslation();

  const auth = useAuth();
  const personalCart = usePersonalCartOptional();
  const budget = useBudgetOptional();

  const [activeSession, setActiveSession] = useState<SharedSession | null>(null);
  const [headerAvatarUri, setHeaderAvatarUri] = useState<string | null>(null);

  const hasActiveSession = activeSession?.status === 'ACTIVE';

  /** Live shared cart when a session is active; otherwise personal cart (solo). */
  const summaryItemCount = useMemo(() => {
    if (hasActiveSession && activeSession) {
      return activeSession.items.length;
    }
    return personalCart?.items.length ?? 0;
  }, [hasActiveSession, activeSession, personalCart?.items.length]);

  const summaryTotal = useMemo(() => {
    if (hasActiveSession && activeSession) {
      return activeSession.totalAmount;
    }
    return personalCart?.total ?? 0;
  }, [hasActiveSession, activeSession, personalCart?.total]);

  const showLiveBadge = hasActiveSession && summaryItemCount > 0;

  const firstName =
    auth.userProfile?.firstName ||
    (auth.userProfile?.fullName ? auth.userProfile.fullName.split(' ')[0] : null) ||
    t('home.fallback_name');

  const loyaltyPoints = Number((auth.userProfile as any)?.loyaltyPoints ?? 0);

  const hour = new Date().getHours();
  const greeting = useMemo(() => {
    if (hour < 12) return t('home.greeting_morning');
    if (hour < 17) return t('home.greeting_afternoon');
    return t('home.greeting_evening');
  }, [hour, t, i18n.language]);

  const tagline = useMemo(
    () =>
      pickTagline(
        {
          hour,
          itemCount: summaryItemCount,
          budgetActive: !!budget?.isActive,
          budgetSet: !!budget && budget.budget > 0,
          budgetProgress: budget?.progress ?? 0,
        },
        t,
      ),
    [
      hour,
      summaryItemCount,
      budget?.isActive,
      budget?.budget,
      budget?.progress,
      t,
      i18n.language,
    ],
  );

  // Refresh active shared session (Shared Cart badge) whenever screen is focused
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      let interval: ReturnType<typeof setInterval> | null = null;
      const userId = auth.currentUser?.id ?? auth.userProfile?.id;
      const refresh = () => {
        setActiveSession(null);
        const uid = userId;
        void (async () => {
          try {
            const suppressed = await getSharedSessionsSuppressedFromLiveUi();
            const focusedId = await getSharedSessionForegroundParticipation();
            if (!focusedId) {
              if (mounted) setActiveSession(null);
              return;
            }
            if (suppressed.has(focusedId)) {
              await clearSharedSessionForegroundParticipation(focusedId);
              if (mounted) setActiveSession(null);
              return;
            }
            let s: SharedSession;
            try {
              s = await getSharedSession(focusedId);
            } catch {
              await clearSharedSessionForegroundParticipation(focusedId);
              if (mounted) setActiveSession(null);
              return;
            }
            if (s.status !== 'ACTIVE' || suppressed.has(s.id)) {
              await clearSharedSessionForegroundParticipation(focusedId);
              if (mounted) setActiveSession(null);
              return;
            }
            if (uid) {
              const allowed =
                s.hostId === uid || s.participants.some((p) => p.userId === uid);
              if (!allowed) {
                await clearSharedSessionForegroundParticipation(focusedId);
                if (mounted) setActiveSession(null);
                return;
              }
            }
            const ACTIVE_MAX_AGE_MS = 2 * 60 * 60 * 1000;
            const createdAtMs = Date.parse(s.createdAt);
            if (
              !Number.isFinite(createdAtMs) ||
              Date.now() - createdAtMs > ACTIVE_MAX_AGE_MS
            ) {
              await clearSharedSessionForegroundParticipation(focusedId);
              if (mounted) setActiveSession(null);
              return;
            }
            if (mounted) setActiveSession(s);
          } catch {
            await clearSharedSessionForegroundParticipation(undefined);
            if (mounted) setActiveSession(null);
          }
        })();
      };
      refresh();
      // Keep UI accurate if session ends while Home is open.
      interval = setInterval(refresh, 3000);
      return () => {
        mounted = false;
        if (interval) clearInterval(interval);
      };
    }, [auth.currentUser?.id, auth.userProfile?.id]),
  );

  useFocusEffect(
    useCallback(() => {
      const uid = auth.currentUser?.id;
      if (!uid) {
        setHeaderAvatarUri(null);
        return;
      }
      let cancelled = false;
      void getSavedProfileAvatar(uid).then((uri) => {
        if (!cancelled) setHeaderAvatarUri(uri);
      });
      return () => {
        cancelled = true;
      };
    }, [auth.currentUser?.id]),
  );

  const initial = (firstName?.[0] ?? 'U').toUpperCase();

  // Cart total spring pulse on change (skip initial mount to avoid fighting layout / entering animations)
  const cartPulse = useSharedValue(1);
  const cartTotalMountSkip = useRef(true);
  useEffect(() => {
    if (cartTotalMountSkip.current) {
      cartTotalMountSkip.current = false;
      return;
    }
    cartPulse.value = withSequence(
      withTiming(1.03, { duration: 120 }),
      withTiming(1, { duration: 180 }),
    );
  }, [summaryTotal]);
  const cartPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cartPulse.value }],
  }));

  // Avatar press animation
  const avatarScale = useSharedValue(1);
  const avatarStyle = useAnimatedStyle(() => ({ transform: [{ scale: avatarScale.value }] }));

  // Settings rotation
  const gearRotation = useSharedValue(0);
  const gearStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${gearRotation.value}deg` }] }));

  const handleNavigate = (screen: keyof RootStackParamList) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (screen === 'PersonalCart') {
      navigation.navigate({ name: 'PersonalCart', params: {}, merge: false });
      return;
    }
    (navigation.navigate as any)(screen);
  };

  // Background colors per mode
  const bgColors: [string, string, string] = isDark
    ? ['#0A0A0F', '#0D1117', '#0A0E1A']
    : ['#EEF2FF', '#F5F0FF', '#EFF6FF'];

  // Orb colors per mode
  const orbBlue   = isDark ? 'rgba(0,122,255,0.18)'   : 'rgba(0,122,255,0.10)';
  const orbPurple = isDark ? 'rgba(175,82,222,0.14)'  : 'rgba(175,82,222,0.08)';
  const orbTeal   = isDark ? 'rgba(50,215,175,0.10)'  : 'rgba(50,215,175,0.07)';

  const budgetProgress = budget?.progress ?? 0;
  const budgetSubtitleProgress = budget && budget.budget > 0 ? budgetProgress : null;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* ── Background gradient ───────────────────────────────────────────── */}
      <Animated.View entering={FadeIn.duration(280)} style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={bgColors}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        {/* Floating ambient orbs */}
        <FloatingOrb size={320} color={orbBlue}   top={-60}  left={-80}  driftX={[-12, 12]} driftY={[-8, 8]}   duration={7000} />
        <FloatingOrb size={280} color={orbPurple} top={180}  right={-100} driftX={[8, -8]}  driftY={[10, -10]} duration={9000} />
        <FloatingOrb size={200} color={orbTeal}   top={420}  left={30}    driftX={[-6, 6]}  driftY={[-12, 6]}  duration={11000} />
        {/* Subtle noise overlay */}
        <View pointerEvents="none" style={[styles.noise, { opacity: isDark ? 0.03 : 0.025 }]} />
      </Animated.View>

      {/* ── Sticky glass header ───────────────────────────────────────────── */}
      <Animated.View
        entering={FadeInDown.delay(80).duration(260)}
        style={[
          styles.header,
          { paddingTop: insets.top, height: insets.top + HEADER_HEIGHT },
        ]}
      >
        <BlurView intensity={isDark ? 75 : 85} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
            },
          ]}
        />
        <View style={styles.headerInner}>
          <View style={styles.headerSideSlot}>
            <Animated.View style={avatarStyle}>
              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  avatarScale.value = withSequence(
                    withTiming(0.96, { duration: 110 }),
                    withTiming(1, { duration: 160 }),
                  );
                  handleNavigate('Profile');
                }}
                accessibilityRole="button"
                accessibilityLabel={t('home.a11y_open_profile')}
                hitSlop={6}
              >
                <LinearGradient
                  colors={[Colors.accent.primary, Colors.accent.purple]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatar}
                >
                  {headerAvatarUri ? (
                    <Image source={{ uri: headerAvatarUri }} style={styles.avatarPhoto} resizeMode="cover" />
                  ) : (
                    <Text style={styles.avatarInitial}>{initial}</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>

          <View style={styles.brandCenter}>
            <ZoomCartLogo style={styles.headerLogo} />
            <Text style={[styles.brandName, { color: C.text }]}>ZOOMCART</Text>
            <Text style={[styles.brandTagline, { color: C.textSecondary, opacity: isDark ? 0.55 : 0.72 }]}>
              {t('home.brand_tagline')}
            </Text>
          </View>

          <View style={styles.headerSideSlot}>
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                gearRotation.value = withSequence(
                  withTiming(90, { duration: 220 }),
                  withTiming(0, { duration: 180 }),
                );
                handleNavigate('Settings');
              }}
              accessibilityRole="button"
              accessibilityLabel={t('home.a11y_settings')}
              hitSlop={6}
            >
              <View
                style={[
                  styles.gearWrap,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
                    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
                  },
                ]}
              >
                <Animated.View style={gearStyle}>
                  <Ionicons name="settings-outline" size={22} color={C.text} />
                </Animated.View>
              </View>
            </Pressable>
          </View>
        </View>
      </Animated.View>

      {/* ── ScrollView content ────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + HEADER_HEIGHT + 20, paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Section A: Greeting hero ─────────────────────────────────── */}
        <View style={styles.greetingWrap}>
          <Animated.View entering={FadeInDown.delay(120).duration(300)} style={styles.greetingRow}>
            <Text style={[styles.greetingLine, { color: C.text }]}>
              <Text style={{ color: C.textSecondary }}>{greeting},</Text>{'  '}
              <Text>{firstName}.</Text>
            </Text>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(200).duration(300)}>
            <Text style={[styles.tagline, { color: C.textSecondary, opacity: isDark ? 0.65 : 0.78 }]}>
              {tagline}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(260).duration(260)} style={styles.pillRow}>
            <Pressable
              onPress={() => handleNavigate('Profile')}
              accessibilityRole="button"
              accessibilityLabel={t('home.a11y_loyalty', {
                points: Math.round(loyaltyPoints).toLocaleString(),
              })}
            >
              <View
                style={[
                  styles.loyaltyPill,
                  {
                    backgroundColor: 'rgba(255,214,10,0.12)',
                    borderColor: 'rgba(255,214,10,0.35)',
                  },
                ]}
              >
                <Ionicons
                  name="ribbon-outline"
                  size={15}
                  color={isDark ? '#FFD60A' : '#B8860B'}
                />
                <AnimatedCounter
                  value={loyaltyPoints}
                  style={[
                    styles.loyaltyValue,
                    { color: isDark ? '#FFD60A' : '#7A5A00' },
                  ]}
                  format={(n) =>
                    `${Math.round(n).toLocaleString()} ${t('home.zoompoints_suffix')}`
                  }
                />
              </View>
            </Pressable>
          </Animated.View>
        </View>

        {/* ── Section B: Cart Summary Hero ─────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(320).duration(300)}
          style={styles.summaryWrap}
        >
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: isDark ? 'rgba(28,28,30,0.55)' : 'rgba(255,255,255,0.82)',
                borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(60,60,67,0.14)',
                ...Shadows.lg,
                shadowColor: '#007AFF',
                shadowOpacity: 0.20,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 8 },
              },
            ]}
          >
            <BlurView intensity={isDark ? 65 : 80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            {/* Diagonal blue tint */}
            <LinearGradient
              colors={['rgba(0,122,255,0.10)', 'rgba(0,122,255,0.00)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            {/* Top rim */}
            <View
              pointerEvents="none"
              style={[styles.cardTopRim, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)' }]}
            />

            <View style={styles.summaryInner}>
              {/* Header row */}
              <View style={styles.summaryHeader}>
                <Text style={[styles.summaryEyebrow, { color: C.textSecondary }]}>
                  {t('home.cart_summary')}
                </Text>
                {showLiveBadge && (
                  <View style={styles.liveRow}>
                    <PulseDot color={Colors.accent.green} />
                    <Text style={[styles.liveText, { color: Colors.accent.green }]}>{t('home.live')}</Text>
                  </View>
                )}
              </View>

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statCol}>
                  <AnimatedCounter
                    value={summaryItemCount}
                    style={[styles.statValue, { color: C.text }]}
                  />
                  <Text style={[styles.statLabel, { color: C.textSecondary }]}>{t('home.items')}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }]} />
                <Animated.View style={[styles.statCol, cartPulseStyle]}>
                  <Text
                    style={[
                      styles.totalValue,
                      { color: summaryTotal > 0 ? Colors.accent.green : C.textSecondary },
                    ]}
                  >
                    {formatLkr(summaryTotal)}
                  </Text>
                  <Text style={[styles.statLabel, { color: C.textSecondary }]}>{t('home.total')}</Text>
                </Animated.View>
              </View>

              {/* CTA */}
              <Pressable
                onPress={() => {
                  if (summaryItemCount === 0) {
                    handleNavigate('ProductScan');
                    return;
                  }
                  if (hasActiveSession && activeSession) {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    (navigation.navigate as any)('ActiveSharedSession', {
                      sessionId: activeSession.id,
                    });
                    return;
                  }
                  handleNavigate('PersonalCart');
                }}
                accessibilityRole="button"
                accessibilityLabel={
                  summaryItemCount === 0
                    ? t('home.a11y_cta_scan')
                    : hasActiveSession && activeSession
                      ? t('home.a11y_cta_session')
                      : t('home.a11y_cta_cart')
                }
              >
                <LinearGradient
                  colors={
                    summaryItemCount > 0
                      ? ['rgba(0,122,255,0.95)', 'rgba(0,122,255,0.70)']
                      : ['rgba(175,82,222,0.95)', 'rgba(175,82,222,0.70)']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ctaBtn}
                >
                  <Text style={styles.ctaText}>
                    {summaryItemCount === 0
                      ? t('home.cta_start')
                      : hasActiveSession && activeSession
                        ? t('home.cta_live')
                        : t('home.cta_cart')}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* ── Section C: Quick Actions Grid ────────────────────────────── */}
        <View style={styles.gridWrap}>
          <View style={styles.gridRow}>
            <QuickActionCard
              iconName="bag-handle-outline"
              title={t('home.quick_personal_title')}
              subtitle={t('home.quick_personal_sub')}
              iconColors={['#007AFF', '#0055FF']}
              tintColor="rgba(0,122,255,0.07)"
              onPress={() => handleNavigate('PersonalCart')}
              delayMs={0}
              isDark={isDark}
            />
            <QuickActionCard
              iconName="people-outline"
              title={t('home.quick_shared_title')}
              subtitle={t('home.quick_shared_sub')}
              iconColors={['#AF52DE', '#7B2FBE']}
              tintColor="rgba(175,82,222,0.07)"
              badgeText={hasActiveSession ? t('home.badge_active') : null}
              badgeColor="#34C759"
              onPress={() => handleNavigate('SharedCart')}
              delayMs={60}
              isDark={isDark}
            />
          </View>
          <View style={styles.gridRow}>
            <QuickActionCard
              iconName="map-outline"
              title={t('home.quick_nav_title')}
              subtitle={t('home.quick_nav_sub')}
              iconColors={['#32D7AF', '#00B4A0']}
              tintColor="rgba(50,215,175,0.07)"
              onPress={() => handleNavigate('StoreNavigation')}
              delayMs={120}
              isDark={isDark}
            />
            <QuickActionCard
              iconName="wallet-outline"
              title={t('home.quick_budget_title')}
              subtitle={t('home.quick_budget_sub')}
              iconColors={['#FF9F0A', '#FF6B00']}
              tintColor="rgba(255,159,10,0.07)"
              progress={budgetSubtitleProgress}
              progressColor={Colors.accent.orange}
              onPress={() => handleNavigate('BudgetLimiter')}
              delayMs={180}
              isDark={isDark}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Background
  orb: {
    position: 'absolute',
  },
  noise: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },

  // Header
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 50,
    overflow: 'hidden',
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PADDING,
    height: HEADER_HEIGHT,
  },
  headerSideSlot: {
    width: HEADER_SIDE_SLOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.20)',
    overflow: 'hidden',
  },
  avatarPhoto: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  brandCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    minWidth: 0,
  },
  headerLogo: {
    width: 38,
    height: 38,
    marginBottom: 5,
  },
  brandName: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 2.5,
    lineHeight: 18,
    textAlign: 'center',
  },
  brandTagline: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 11,
    letterSpacing: 1.2,
    marginTop: 2,
    lineHeight: 14,
    textAlign: 'center',
  },
  gearWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // Scroll
  scroll: {
    paddingHorizontal: H_PADDING,
  },

  // Greeting
  greetingWrap: {
    marginBottom: Spacing.lg,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  greetingLine: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  tagline: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 15,
    fontStyle: 'italic',
    marginTop: 4,
    letterSpacing: -0.24,
  },
  pillRow: {
    marginTop: Spacing.md,
    flexDirection: 'row',
  },
  loyaltyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  loyaltyValue: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Cart Summary
  summaryWrap: {
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardTopRim: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  summaryInner: {
    padding: 22,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryEyebrow: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.8,
    opacity: 0.55,
    textTransform: 'uppercase',
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveText: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  divider: {
    width: 1,
    height: 44,
    marginHorizontal: 8,
  },
  statValue: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
  },
  totalValue: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 12,
    opacity: 0.65,
    letterSpacing: 0.2,
  },
  ctaBtn: {
    marginTop: 14,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  ctaText: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },

  // Quick Action Grid
  gridWrap: {
    gap: CARD_GAP,
    marginBottom: Spacing.lg,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: CARD_GAP,
  },
  gridCell: {
    flex: 1,
    minWidth: 0,
  },
  qaPressable: {
    flex: 1,
  },
  qaCard: {
    flex: 1,
    minHeight: 156,
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    paddingBottom: 36,
    overflow: 'hidden',
  },
  qaCardInner: {
    flex: 1,
    flexDirection: 'column',
    zIndex: 1,
  },
  qaSpacer: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 4,
  },
  rimHighlight: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  qaIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaTitle: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginTop: 10,
  },
  qaSubtitle: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
    letterSpacing: -0.08,
  },
  qaArrow: {
    position: 'absolute',
    right: 14,
    bottom: 12,
    opacity: 1,
  },
  qaBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    zIndex: 2,
  },
  qaBadgeText: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  qaProgressTrack: {
    marginTop: 6,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  qaProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
});

export default HomeScreen;
