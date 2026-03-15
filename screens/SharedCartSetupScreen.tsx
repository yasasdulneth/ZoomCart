import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
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
import { BlurView } from 'expo-blur';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import GlassButton from '../components/GlassButton';
import GlassCard from '../components/GlassCard';
import SharedCartHeader from '../components/sharedCart/SharedCartHeader';
import FriendListItem from '../components/sharedCart/FriendListItem';
import FriendQRScannerModal from '../components/sharedCart/FriendQRScannerModal';
import BudgetAllocationInput from '../components/sharedCart/BudgetAllocationInput';
import AppFooter from '../components/AppFooter';
import { Colors, Typography, Spacing, BorderRadius, BlurIntensity } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { getSavedFriends, removeFriend as removeFriendFromService } from '../lib/services/friends.service';
import type { Friend } from '../lib/services/friends.service';
import { createSharedSession } from '../lib/services/sharedSession.service';
import { useSocket } from '../context/SocketContext';
import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigationProp } from '../types/navigation';
import { useTranslation } from 'react-i18next';

function buildMyQrPayload(input: { userId: string; name: string; phoneNumber: string }) {
  return JSON.stringify({
    id: input.userId,
    userId: input.userId,
    name: input.name,
    phone: input.phoneNumber,
    phoneNumber: input.phoneNumber });
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

function QrSheet({
  visible,
  onClose,
  payload,
  title,
  subtitle }: {
  visible: boolean;
  onClose: () => void;
  payload: string;
  title: string;
  subtitle: string;
}) {
  const { isDark, colors: C } = useResolvedTheme();
  const { t } = useTranslation();
  const sheetTintBlur: 'dark' | 'light' = isDark ? 'dark' : 'light';
  const sheetGrad = isDark
    ? ([Colors.glass.medium, Colors.glass.dark] as const)
    : (['rgba(255,255,255,0.95)', 'rgba(245,245,250,0.92)'] as const);

  if (!visible) return null;
  return (
    <Pressable style={[styles.sheetBackdrop, { backgroundColor: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.45)' }]} onPress={onClose}>
      <Pressable style={styles.sheetWrap} onPress={(e) => e.stopPropagation()}>
        <BlurView intensity={BlurIntensity.medium} tint={sheetTintBlur} style={styles.sheetBlur}>
          <LinearGradient
            colors={sheetGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.sheetCard, { borderColor: C.borderSubtle }]}
          >
            <Text style={[styles.sheetTitle, { color: C.text }]}>{title}</Text>
            <Text style={[styles.sheetSubtitle, { color: C.textSecondary }]}>{subtitle}</Text>
            <View style={styles.qrSurface}>
              <QRCode value={payload} size={220} backgroundColor="#FFFFFF" color="#0A0A0F" quietZone={10} />
            </View>
            <Pressable
              style={[styles.sheetClose, { backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.06)' }]}
              onPress={onClose}
            >
              <Text style={[styles.sheetCloseText, { color: C.text }]}>{t('sharedCart.close')}</Text>
            </Pressable>
          </LinearGradient>
        </BlurView>
      </Pressable>
    </Pressable>
  );
}

export default function SharedCartSetupScreen() {
  const navigation = useNavigation<RootStackNavigationProp<'SharedCartSetup'>>();
  const { userProfile, currentUser } = useAuth();
  const { emitSessionInvite, joinSessionRoom } = useSocket();
  const { t } = useTranslation();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [budgetsByUserId, setBudgetsByUserId] = useState<Record<string, string>>({});
  const [unlimitedByUserId, setUnlimitedByUserId] = useState<Record<string, boolean>>({});
  const [hostUnlimited, setHostUnlimited] = useState(true);
  const [hostBudget, setHostBudget] = useState('');
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [showMyQr, setShowMyQr] = useState(false);
  const [showScanFriendQr, setShowScanFriendQr] = useState(false);

  const { isDark, colors: C } = useResolvedTheme();
  const insets = useSafeAreaInsets();

  const bgColors = useMemo<[string, string, string]>(
    () => (isDark ? ['#0A0A0F', '#0D1117', '#0A0E1A'] : ['#EEF2FF', '#F5F0FF', '#EFF6FF']),
    [isDark],
  );

  const orbBlue = isDark ? 'rgba(0,122,255,0.18)' : 'rgba(0,122,255,0.10)';
  const orbPurple = isDark ? 'rgba(175,82,222,0.14)' : 'rgba(175,82,222,0.08)';
  const orbTeal = isDark ? 'rgba(50,215,175,0.10)' : 'rgba(50,215,175,0.07)';

  const load = useCallback(async () => {
    setLoadingFriends(true);
    try {
      const list = await getSavedFriends();
      setFriends(list);
    } finally {
      setLoadingFriends(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleFriendSelect = useCallback((id: string) => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDeleteFriend = useCallback(
    async (id: string) => {
      await removeFriendFromService(id);
      setSelectedFriendIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await load();
    },
    [load],
  );

  const selectedFriends = useMemo(
    () => friends.filter((f) => selectedFriendIds.has(f.id)),
    [friends, selectedFriendIds],
  );

  const hostId = currentUser?.id ?? userProfile?.id ?? 'unknown';
  const hostName =
    userProfile?.fullName || `${userProfile?.firstName ?? ''} ${userProfile?.lastName ?? ''}`.trim() || 'Me';
  const hostPhone = userProfile?.mobileNumber ?? '';

  useEffect(() => {
    setBudgetsByUserId((prev) => {
      const next = { ...prev };
      for (const f of selectedFriends) {
        if (next[f.id] === undefined) next[f.id] = '';
      }
      for (const k of Object.keys(next)) {
        if (selectedFriendIds.has(k)) continue;
        delete next[k];
      }
      return next;
    });

    setUnlimitedByUserId((prev) => {
      const next = { ...prev };
      for (const f of selectedFriends) {
        if (next[f.id] === undefined) next[f.id] = false;
      }
      for (const k of Object.keys(next)) {
        if (selectedFriendIds.has(k)) continue;
        delete next[k];
      }
      return next;
    });
  }, [selectedFriends, selectedFriendIds]);

  const myQrPayload = useMemo(() => {
    const userId = currentUser?.id ?? userProfile?.id ?? 'unknown';
    const name =
      userProfile?.fullName || `${userProfile?.firstName ?? ''} ${userProfile?.lastName ?? ''}`.trim() || 'User';
    const phoneNumber = userProfile?.mobileNumber ?? '';
    return buildMyQrPayload({ userId, name, phoneNumber });
  }, [currentUser?.id, userProfile]);

  const budgetErrors = useMemo(() => {
    const errors: Record<string, string | null> = {};

    for (const f of selectedFriends) {
      if (unlimitedByUserId[f.id]) {
        errors[f.id] = null;
        continue;
      }
      const raw = (budgetsByUserId[f.id] ?? '').trim();
      const val = Number(raw);
      if (!raw) errors[f.id] = t('sharedCartSetup.err_budget_or_unlimited');
      else if (!Number.isFinite(val) || val <= 0) errors[f.id] = t('sharedCartSetup.err_positive_number');
      else errors[f.id] = null;
    }

    if (!hostUnlimited) {
      const raw = hostBudget.trim();
      const val = Number(raw);
      if (!raw) errors[hostId] = t('sharedCartSetup.err_host_budget');
      else if (!Number.isFinite(val) || val < 0) errors[hostId] = t('sharedCartSetup.err_host_nonneg');
      else errors[hostId] = null;
    } else {
      errors[hostId] = null;
    }

    return errors;
  }, [selectedFriends, budgetsByUserId, hostUnlimited, hostBudget, hostId, unlimitedByUserId, t]);

  const startDisabled = useMemo(() => {
    if (selectedFriends.length === 0) return true;
    for (const f of selectedFriends) {
      if (budgetErrors[f.id]) return true;
    }
    if (budgetErrors[hostId]) return true;
    return false;
  }, [selectedFriends, budgetErrors, hostId]);

  const handleStart = useCallback(async () => {
    if (startDisabled) return;

    const hostAllocatedBudget = hostUnlimited ? 0 : Number(hostBudget.trim() || 0);

    const session = await createSharedSession({
      hostId,
      participants: [
        {
          userId: hostId,
          name: hostName,
          phoneNumber: hostPhone,
          avatar: undefined,
          role: 'HOST',
          allocatedBudget: Number.isFinite(hostAllocatedBudget) ? hostAllocatedBudget : 0,
          spentAmount: 0,
          remainingBudget: Number.POSITIVE_INFINITY,
          joinedAt: new Date().toISOString() },
        ...selectedFriends.map((f) => ({
          userId: f.id,
          name: f.name,
          phoneNumber: f.phoneNumber,
          avatar: f.avatar ?? undefined,
          role: 'MEMBER' as const,
          allocatedBudget: unlimitedByUserId[f.id] ? 0 : Number((budgetsByUserId[f.id] ?? '0').trim() || 0),
          spentAmount: 0,
          remainingBudget: 0,
          joinedAt: new Date().toISOString() })),
      ] });

    const invitedUserIds = selectedFriends.map((f) => f.id);
    emitSessionInvite(session, invitedUserIds);
    joinSessionRoom(session.id, hostId);
    navigation.navigate('ActiveSharedSession', { sessionId: session.id });
  }, [
    startDisabled,
    selectedFriends,
    budgetsByUserId,
    unlimitedByUserId,
    hostUnlimited,
    hostBudget,
    hostId,
    hostName,
    hostPhone,
    navigation,
    emitSessionInvite,
    joinSessionRoom,
  ]);

  const headerSubtitle = useMemo(() => {
    if (selectedFriends.length === 0) {
      if (friends.length === 0) return t('sharedCartSetup.subtitle_no_selected_no_saved');
      return t('sharedCartSetup.subtitle_saved_tap', { count: friends.length });
    }
    return selectedFriends.length === 1
      ? t('sharedCartSetup.join_one', { count: selectedFriends.length })
      : t('sharedCartSetup.join_other', { count: selectedFriends.length });
  }, [selectedFriends.length, friends.length, t]);

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
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <SharedCartHeader key="setup-header" onBack={() => navigation.goBack()} subtitle={headerSubtitle} />

          <Animated.View
            key="setup-qr-row"
            entering={FadeInDown.delay(40).duration(300)}
            style={styles.qrRow}
          >
            <GlassButton
              key="setup-btn-my-qr"
              title={t('sharedCart.my_qr')}
              variant="outline"
              size="md"
              style={styles.qrBtn}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowMyQr(true);
              }}
              icon={<Ionicons name="qr-code-outline" size={20} color={Colors.accent.primary} />}
              accessibilityLabel={t('sharedCartSetup.my_qr_a11y')}
            />
            <GlassButton
              key="setup-btn-scan-qr"
              title={t('sharedCart.scan_qr')}
              variant="outline"
              size="md"
              style={styles.qrBtn}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowScanFriendQr(true);
              }}
              icon={<Ionicons name="scan-outline" size={20} color={Colors.accent.primary} />}
              accessibilityLabel={t('sharedCartSetup.scan_friend_a11y')}
            />
          </Animated.View>

          <Animated.View key="setup-friends-section" entering={FadeInDown.delay(70).duration(300)}>
            <GlassCard style={styles.sectionCard} padding={Spacing.lg}>
              <Text key="friends-title" style={[styles.cardTitle, { color: C.text }]}>
                {t('sharedCart.friends_title')}
              </Text>
              <Text key="friends-hint" style={[styles.cardHint, { color: C.textSecondary }]}>
                {t('sharedCartSetup.friends_hint')}
              </Text>

              {loadingFriends ? (
                <Text key="friends-loading" style={[styles.muted, { color: C.textTertiary }]}>
                  {t('sharedCart.loading_friends')}
                </Text>
              ) : friends.length === 0 ? (
                <Animated.View
                  key="friends-empty"
                  entering={FadeIn.delay(120).duration(320)}
                  style={styles.emptyInline}
                >
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="people-outline" size={32} color={Colors.accent.primary} />
                  </View>
                  <Text style={[styles.emptyInlineText, { color: C.textSecondary }]}>
                    {t('sharedCartSetup.friends_empty_detail')}
                  </Text>
                </Animated.View>
              ) : (
                <View key="friends-list" style={styles.list}>
                  {friends.map((f) => (
                    <View key={f.id}>
                      <FriendListItem
                        friend={({ id: f.id, name: f.name, phone: f.phoneNumber, avatar: f.avatar ?? '' } as any)}
                        selected={selectedFriendIds.has(f.id)}
                        onToggle={() => toggleFriendSelect(f.id)}
                        onDelete={() => void handleDeleteFriend(f.id)}
                      />
                    </View>
                  ))}
                </View>
              )}
            </GlassCard>
          </Animated.View>

          <Animated.View key="setup-budgets-section" entering={FadeInDown.delay(100).duration(300)}>
            <GlassCard style={styles.sectionCard} padding={Spacing.lg}>
              <Text key="budgets-title" style={[styles.cardTitle, { color: C.text }]}>
                {t('sharedCart.budgets_title')}
              </Text>
              <Text key="budgets-hint" style={[styles.cardHint, { color: C.textSecondary }]}>
                {t('sharedCartSetup.budgets_hint')}
              </Text>

              <View key="host-budget-row" style={styles.hostRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.hostTitle, { color: C.text }]}>{t('sharedCart.host_budget_title')}</Text>
                  <Text style={[styles.hostHint, { color: C.textSecondary }]}>{t('sharedCart.host_hint')}</Text>
                </View>
                <Switch
                  value={hostUnlimited}
                  onValueChange={setHostUnlimited}
                  trackColor={{ false: isDark ? '#3A3A3C' : '#E5E5EA', true: Colors.accent.primary + '88' }}
                  thumbColor={hostUnlimited ? Colors.accent.primary : isDark ? '#8E8E93' : '#F2F2F7'}
                />
              </View>

              {!hostUnlimited && (
                <View key="host-budget-input" style={{ marginTop: Spacing.sm }}>
                  <BudgetAllocationInput
                    name={`${hostName} (Host)`}
                    phoneNumber={hostPhone}
                    value={hostBudget}
                    onChange={setHostBudget}
                    error={budgetErrors[hostId] ?? null}
                  />
                </View>
              )}

              <View key="member-budgets" style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
                {selectedFriends.length === 0 ? (
                  <Text key="budgets-select-hint" style={[styles.muted, { color: C.textTertiary }]}>
                    {t('sharedCartSetup.select_budget_hint')}
                  </Text>
                ) : (
                  selectedFriends.map((f) => {
                    const isUnlimited = Boolean(unlimitedByUserId[f.id]);
                    return (
                      <View key={f.id} style={styles.memberBudgetWrap}>
                        <View style={styles.memberBudgetHeader}>
                          <Text style={[styles.memberBudgetTitle, { color: C.textSecondary }]}>
                            {t('sharedCart.no_budget_limit')}
                          </Text>
                          <Switch
                            value={isUnlimited}
                            onValueChange={(v) => setUnlimitedByUserId((prev) => ({ ...prev, [f.id]: v }))}
                            trackColor={{ false: isDark ? '#3A3A3C' : '#E5E5EA', true: Colors.accent.primary + '88' }}
                            thumbColor={isUnlimited ? Colors.accent.primary : isDark ? '#8E8E93' : '#F2F2F7'}
                          />
                        </View>
                        {isUnlimited ? (
                          <GlassCard style={styles.unlimitedCard} padding={Spacing.md}>
                            <Text style={[styles.unlimitedName, { color: C.text }]} numberOfLines={1}>
                              {f.name}
                            </Text>
                            <Text style={[styles.unlimitedPhone, { color: C.textSecondary }]} numberOfLines={1}>
                              {f.phoneNumber || t('profile.dash')}
                            </Text>
                            <View style={styles.unlimitedPill}>
                              <Text style={styles.unlimitedPillText}>{t('sharedCart.unlimited')}</Text>
                            </View>
                          </GlassCard>
                        ) : (
                          <BudgetAllocationInput
                            name={f.name}
                            phoneNumber={f.phoneNumber}
                            value={budgetsByUserId[f.id] ?? ''}
                            onChange={(v) => setBudgetsByUserId((prev) => ({ ...prev, [f.id]: v }))}
                            error={budgetErrors[f.id] ?? null}
                          />
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            </GlassCard>
          </Animated.View>
        </ScrollView>

        <View style={styles.footerBlock}>
          <GlassCard style={styles.ctaCard} padding={Spacing.lg}>
            <Text key="cta-hint" style={[styles.ctaHint, { color: C.textSecondary }]}>
              {startDisabled
                ? selectedFriends.length === 0
                  ? t('sharedCartSetup.cta_need_friend')
                  : t('sharedCartSetup.cta_fix_budget')
                : selectedFriends.length === 1
                  ? t('sharedCartSetup.cta_ready_one', { count: selectedFriends.length })
                  : t('sharedCartSetup.cta_ready_other', { count: selectedFriends.length })}
            </Text>
            <GlassButton
              key="cta-start-shared"
              title={t('sharedCart.start_shared')}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                void handleStart();
              }}
              variant="fill"
              size="lg"
              disabled={startDisabled}
              style={styles.startBtn}
              accessibilityLabel={t('sharedCartSetup.start_shared_a11y')}
            />
          </GlassCard>
        </View>

        <View key="setup-footer-spacer" style={{ paddingBottom: Math.max(insets.bottom, Spacing.md) }}>
          <AppFooter />
        </View>
      </View>

      <QrSheet
        visible={showMyQr}
        onClose={() => setShowMyQr(false)}
        payload={myQrPayload}
        title={t('sharedCart.add_me_title')}
        subtitle={t('sharedCart.add_me_sub')}
      />

      <FriendQRScannerModal
        visible={showScanFriendQr}
        onClose={() => {
          setShowScanFriendQr(false);
          void load();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  orb: { position: 'absolute' },
  body: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Spacing.md },
  qrRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md },
  qrBtn: { flex: 1 },
  sectionCard: {
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md },
  cardTitle: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.xl,
    marginBottom: Spacing.xs },
  cardHint: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
    marginBottom: Spacing.md },
  list: { marginTop: Spacing.xs },
  emptyInline: {
    alignItems: 'center',
    paddingVertical: Spacing.lg },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(0,122,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md },
  emptyInlineText: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.sm },
  muted: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    marginTop: Spacing.sm },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.xs },
  hostTitle: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base },
  hostHint: {
    marginTop: 2,
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm },
  memberBudgetWrap: { gap: Spacing.xs },
  memberBudgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2 },
  memberBudgetTitle: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm },
  unlimitedCard: {
    borderWidth: 1,
    borderColor: 'rgba(0,122,255,0.2)',
    gap: 2 },
  unlimitedName: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base },
  unlimitedPhone: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm },
  unlimitedPill: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(0,122,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,122,255,0.22)' },
  unlimitedPillText: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.sm,
    color: Colors.accent.primary },
  footerBlock: {
    paddingBottom: Spacing.sm },
  ctaCard: {
    borderRadius: BorderRadius.xl },
  ctaHint: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 20 },
  startBtn: {
    width: '100%' },

  sheetBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    padding: Spacing.lg,
    zIndex: 100 },
  sheetWrap: { width: '100%' },
  sheetBlur: { borderRadius: BorderRadius.xl, overflow: 'hidden' },
  sheetCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: 'center' },
  sheetTitle: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.xl,
    marginBottom: Spacing.xs },
  sheetSubtitle: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    marginBottom: Spacing.lg,
    textAlign: 'center',
    lineHeight: 20 },
  qrSurface: { backgroundColor: '#FFF', padding: Spacing.md, borderRadius: BorderRadius.lg },
  sheetClose: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md },
  sheetCloseText: {
    fontFamily: Typography.fonts.primaryMedium,
    fontSize: Typography.sizes.base } });
