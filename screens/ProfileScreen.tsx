import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useResolvedTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { Typography, Spacing, BorderRadius, Colors } from '../constants/theme';
import { fetchUserProfile, type UserProfile } from '../lib/api/profile';
import AvatarPickerModal from '../components/profile/AvatarPickerModal';
import InfoCard from '../components/profile/InfoCard';
import LoyaltyPointsCard from '../components/profile/LoyaltyPointsCard';
import AppFooter from '../components/AppFooter';
import GlassButton from '../components/GlassButton';
import GlassCard from '../components/GlassCard';
import { SkeletonCard } from '../components/SkeletonLoader';
import { useAuth } from '../context/AuthContext';
import { getSavedProfileAvatar, saveProfileAvatarFromPicker } from '../lib/services/localProfileAvatar.service';
import { useTranslation } from 'react-i18next';

const AVATAR_SIZE = 112;

function formatMemberSince(iso: string | null | undefined, dash: string): string {
  if (iso == null || iso === '') return dash;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return dash;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

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
    transform: [{ translateX: tx.value }, { translateY: ty.value }]
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
          right
        },
        motion,
      ]}
    />
  );
}

function ProfileHeroHeader({ onBack }: { onBack: () => void }) {
  const { isDark, colors: C } = useResolvedTheme();
  const { t } = useTranslation();
  const pillBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const pillBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

  return (
    <View style={styles.heroHeaderRow}>
      <Pressable
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onBack();
        }}
        style={({ pressed }) => [
          styles.backPill,
          { backgroundColor: pillBg, borderColor: pillBorder, opacity: pressed ? 0.85 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('profile.go_back_a11y')}
      >
        <Ionicons name="chevron-back" size={22} color={Colors.accent.primary} />
      </Pressable>
      <View style={styles.heroTextCol}>
        <Text style={[styles.heroKicker, { color: C.textSecondary }]}>{t('profile.hero_kicker')}</Text>
        <Text style={[styles.heroTitle, { color: C.text }]}>{t('profile.hero_title')}</Text>
        <Text style={[styles.heroSub, { color: C.textSecondary }]}>{t('profile.hero_sub')}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { logout, userProfile, currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isDark, colors: C } = useResolvedTheme();
  const { t } = useTranslation();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const avatarScale = useSharedValue(1);
  const avatarOpacity = useSharedValue(0);

  const fallbackProfile = useCallback(() => {
    const name =
      userProfile?.fullName ||
      `${userProfile?.firstName ?? ''} ${userProfile?.lastName ?? ''}`.trim() ||
      userProfile?.email ||
      currentUser?.email ||
      t('common.user');
    const phone = userProfile?.mobileNumber ?? '';
    const loyaltyPoints = Number((userProfile as unknown as { loyaltyPoints?: number })?.loyaltyPoints ?? 0);
    const av = (userProfile as unknown as { avatarUri?: string })?.avatarUri ?? null;
    return {
      name,
      phone,
      loyaltyPoints,
      avatarUri: av,
      createdAt: userProfile?.createdAt ?? null,
      completedOrdersCount: userProfile?.completedOrdersCount ?? 0
    };
  }, [currentUser?.email, userProfile, t]);

  const loadProfile = useCallback(async () => {
    const uid = currentUser?.id;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserProfile();
      setProfile(data);
      setEditName(data.name);
      setEditPhone(data.phone);
      const persisted = uid ? await getSavedProfileAvatar(uid) : null;
      setAvatarUri(persisted ?? data.avatarUri ?? null);
    } catch {
      const local = fallbackProfile();
      if (local) {
        setProfile(local as UserProfile);
        setEditName(local.name);
        setEditPhone(local.phone);
        const persisted = uid ? await getSavedProfileAvatar(uid) : null;
        setAvatarUri(persisted ?? local.avatarUri ?? null);
        setError(null);
      } else {
        setError(t('profile.load_err'));
      }
    } finally {
      setLoading(false);
    }
  }, [fallbackProfile, currentUser?.id, t]);

  const handleAvatarPicked = useCallback(
    async (uri: string) => {
      try {
        const uid = currentUser?.id;
        if (uid) {
          const saved = await saveProfileAvatarFromPicker(uid, uri);
          setAvatarUri(saved);
        } else {
          setAvatarUri(uri);
        }
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        Alert.alert(t('profile.photo_err_title'), t('profile.photo_err_body'));
      }
    },
    [currentUser?.id, t],
  );

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!loading) {
      avatarOpacity.value = withTiming(1, { duration: 360 });
    }
  }, [loading]);

  const avatarAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }],
    opacity: avatarOpacity.value
  }));

  const displayUri = avatarUri ?? profile?.avatarUri ?? null;
  const displayName = editName || profile?.name || '';
  const initials = displayName
    ? displayName
      .split(' ')
      .filter(Boolean)
      .map((n: string) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
    : 'U';

  const bgColors: [string, string, string] = isDark
    ? ['#0A0A0F', '#0D1117', '#0A0E1A']
    : ['#EEF2FF', '#F5F0FF', '#EFF6FF'];

  const orbBlue = isDark ? 'rgba(0,122,255,0.18)' : 'rgba(0,122,255,0.10)';
  const orbPurple = isDark ? 'rgba(175,82,222,0.14)' : 'rgba(175,82,222,0.08)';
  const orbTeal = isDark ? 'rgba(50,215,175,0.10)' : 'rgba(50,215,175,0.07)';

  const statTileBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const statBorder = C.borderSubtle;

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Animated.View entering={FadeInDown.duration(380)} style={StyleSheet.absoluteFill}>
        <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <FloatingOrb size={260} color={orbBlue} top={-100} left={-70} driftX={[0, 12]} driftY={[0, 10]} duration={7000} />
        <FloatingOrb
          size={210}
          color={orbPurple}
          top={420}
          right={-55}
          driftX={[0, -10]}
          driftY={[0, 12]}
          duration={8200}
        />
        <FloatingOrb size={170} color={orbTeal} top={150} right={-30} driftX={[0, 8]} driftY={[0, -10]} duration={7600} />
        <View pointerEvents="none" style={StyleSheet.absoluteFill} />
      </Animated.View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + Spacing.sm,
            paddingHorizontal: Spacing.lg,
            paddingBottom: insets.bottom + 100
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ProfileHeroHeader onBack={() => navigation.goBack()} />

        {loading ? (
          <View style={styles.skeletonStack}>
            <SkeletonCard lines={2} showAvatar style={styles.skCard} />
            <SkeletonCard lines={3} style={styles.skCard} />
            <SkeletonCard lines={2} style={styles.skCard} />
          </View>
        ) : error ? (
          <Animated.View entering={FadeInDown.duration(320)}>
            <GlassCard style={styles.errorCard}>
              <View style={styles.errorInner}>
                <Ionicons name="alert-circle-outline" size={40} color={Colors.accent.orange} />
                <Text style={[styles.errorTitle, { color: C.text }]}>{t('profile.refresh_fail_title')}</Text>
                <Text style={[styles.errorBody, { color: C.textSecondary }]}>{error}</Text>
                <GlassButton title={t('common.retry')} onPress={loadProfile} variant="outline" size="md" />
              </View>
            </GlassCard>
          </Animated.View>
        ) : (
          <>
            <Animated.View entering={FadeInDown.delay(40).duration(320)} style={styles.avatarSection}>
              <AnimatedTouchable
                style={[styles.avatarOuter, avatarAnimStyle]}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPickerVisible(true);
                }}
                onPressIn={() => {
                  avatarScale.value = withTiming(0.96, { duration: 100 });
                }}
                onPressOut={() => {
                  avatarScale.value = withTiming(1, { duration: 140 });
                }}
                activeOpacity={1}
                accessibilityLabel={t('profile.change_photo_a11y')}
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={[`${Colors.accent.primary}55`, `${Colors.accent.secondary}33`]}
                  style={styles.avatarGlow}
                >
                  <LinearGradient
                    colors={[Colors.accent.primary, Colors.accent.secondary]}
                    style={styles.avatarGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {displayUri ? (
                      <Image source={{ uri: displayUri }} style={styles.avatarImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.initialsWrap}>
                        <Text style={styles.initials}>{initials}</Text>
                      </View>
                    )}
                  </LinearGradient>
                  <View style={[styles.editBadge, { backgroundColor: Colors.accent.primary }]}>
                    <Ionicons name="pencil" size={14} color="#FFFFFF" />
                  </View>
                </LinearGradient>
              </AnimatedTouchable>

              <View style={styles.nameWrap}>
                <Text style={[styles.displayName, { color: C.text }]}>{displayName}</Text>
                {!!editPhone && <Text style={[styles.displayPhone, { color: C.textSecondary }]}>{editPhone}</Text>}
              </View>
            </Animated.View>

            {profile && (
              <Animated.View entering={FadeInDown.delay(90).duration(320)} style={styles.statsRow}>
                {[
                  {
                    icon: 'sparkles-outline' as const,
                    value: String(profile.loyaltyPoints ?? 0),
                    labelKey: 'profile.stat_zoompoints' as const,
                    iconColor: Colors.accent.purple,
                    labelLines: 1 as const,
                    valueLines: 1 as const
                  },
                  {
                    icon: 'cube-outline' as const,
                    value: String(profile.completedOrdersCount ?? 0),
                    labelKey: 'profile.stat_orders' as const,
                    iconColor: Colors.accent.primary,
                    labelLines: 1 as const,
                    valueLines: 1 as const
                  },
                  {
                    icon: 'calendar-outline' as const,
                    value: formatMemberSince(profile.createdAt, t('profile.dash')),
                    labelKey: 'profile.stat_member' as const,
                    iconColor: Colors.accent.green,
                    labelLines: 2 as const,
                    valueLines: 2 as const,
                    valueFontSize: 15 as const
                  },
                ].map((s) => (
                  <GlassCard key={s.labelKey} style={[styles.statCard, { borderColor: statBorder }]} padding={12}>
                    <View style={[styles.statIconCircle, { backgroundColor: statTileBg }]}>
                      <Ionicons name={s.icon} size={20} color={s.iconColor} />
                    </View>
                    <Text
                      style={[
                        styles.statValue,
                        {
                          color: C.text,
                          fontSize: (s as { valueFontSize?: number }).valueFontSize ?? 17
                        },
                      ]}
                      numberOfLines={s.valueLines ?? 1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.82}
                    >
                      {s.value}
                    </Text>
                    <Text
                      style={[styles.statLabel, { color: C.textSecondary }]}
                      numberOfLines={s.labelLines}
                    >
                      {t(s.labelKey)}
                    </Text>
                  </GlassCard>
                ))}
              </Animated.View>
            )}

            {profile && (
              <>
                <Animated.View entering={FadeInDown.delay(130).duration(320)}>
                  <InfoCard
                    name={editName}
                    phone={editPhone}
                    loyaltyPoints={profile.loyaltyPoints}
                    editable
                    onNameChange={setEditName}
                    onPhoneChange={setEditPhone}
                    style={styles.infoCard}
                  />
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(170).duration(320)}>
                  <LoyaltyPointsCard points={profile.loyaltyPoints} style={styles.pointsCard} />
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(210).duration(320)}>
                  <GlassButton
                    title={t('profile.logout')}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      void logout();
                    }}
                    variant="danger"
                    size="lg"
                    style={styles.logoutBtn}
                    accessibilityLabel={t('profile.logout_a11y')}
                  />
                </Animated.View>
              </>
            )}
          </>
        )}

        <View style={{ marginTop: Spacing.lg }}>
          <AppFooter />
        </View>
      </ScrollView>

      <AvatarPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelectAvatar={handleAvatarPicked}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  orb: { position: 'absolute' },
  scroll: {},
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.lg
  },
  backPill: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4
  },
  heroTextCol: { flex: 1 },
  heroKicker: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 4
  },
  heroTitle: {
    fontFamily: Typography.fonts.accentBold,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.35
  },
  heroSub: {
    marginTop: 6,
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    lineHeight: 20
  },
  skeletonStack: { gap: Spacing.md },
  skCard: { borderRadius: BorderRadius.lg },
  errorCard: { borderRadius: BorderRadius.xl, marginTop: Spacing.md },
  errorInner: { alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.sm },
  errorTitle: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.lg,
    marginTop: Spacing.sm
  },
  errorBody: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md
  },
  avatarSection: { alignItems: 'center', marginBottom: Spacing.lg },
  avatarOuter: { alignItems: 'center', justifyContent: 'center' },
  avatarGlow: {
    width: AVATAR_SIZE + 22,
    height: AVATAR_SIZE + 22,
    borderRadius: (AVATAR_SIZE + 22) / 2,
    padding: 11,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarGradient: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.28)'
  },
  avatarImage: { width: '100%', height: '100%' },
  initialsWrap: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.22)'
  },
  initials: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: 36,
    color: '#FFFFFF'
  },
  editBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  nameWrap: { alignItems: 'center', marginTop: Spacing.md, gap: 4 },
  displayName: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: 22,
    letterSpacing: 0.35,
    textAlign: 'center'
  },
  displayPhone: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 15,
    letterSpacing: -0.24
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg
  },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
    minWidth: 0
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statValue: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: 17,
    letterSpacing: 0.2,
    textAlign: 'center'
  },
  statLabel: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    textAlign: 'center'
  },
  infoCard: { marginBottom: Spacing.md },
  pointsCard: { marginBottom: Spacing.md },
  logoutBtn: { marginBottom: Spacing.lg }
});
