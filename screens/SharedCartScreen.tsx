import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
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
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackNavigationProp } from '../types/navigation';

import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import SharedCartHeader from '../components/sharedCart/SharedCartHeader';
import FriendListItem from '../components/sharedCart/FriendListItem';
import FriendQRModal from '../components/sharedCart/FriendQRModal';
import FriendQRScannerModal from '../components/sharedCart/FriendQRScannerModal';
import ActivityToast from '../components/sharedCart/ActivityToast';
import AppFooter from '../components/AppFooter';

import { useAuth } from '../context/AuthContext';
import { useFriends } from '../context/FriendContext';
import { useSocket } from '../context/SocketContext';
import {
  getSavedFriends,
  removeFriend as removeFriendFromService,
  type Friend } from '../lib/services/friends.service';
import { createSharedSession } from '../lib/services/sharedSession.service';

import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import { useTranslation } from 'react-i18next';

const FRIENDS_VISIBLE_COUNT = 5;

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

const SharedCartScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp<'SharedCart'>>();
  const { userProfile, currentUser } = useAuth();
  const { getOrCreateMe, removeFriend: removeFriendFromCtx } = useFriends();
  const { emitSessionInvite, joinSessionRoom } = useSocket();
  const { isDark, colors: C } = useResolvedTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const bgColors = useMemo<[string, string, string]>(
    () => (isDark ? ['#0A0A0F', '#0D1117', '#0A0E1A'] : ['#EEF2FF', '#F5F0FF', '#EFF6FF']),
    [isDark],
  );

  const orbBlue = isDark ? 'rgba(0,122,255,0.18)' : 'rgba(0,122,255,0.10)';
  const orbPurple = isDark ? 'rgba(175,82,222,0.14)' : 'rgba(175,82,222,0.08)';
  const orbTeal = isDark ? 'rgba(50,215,175,0.10)' : 'rgba(50,215,175,0.07)';

  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [showMyQr, setShowMyQr] = useState(false);
  const [showScanQr, setShowScanQr] = useState(false);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [friendsExpanded, setFriendsExpanded] = useState(false);
  const [starting, setStarting] = useState(false);
  const [toast, setToast] = useState<{ message: string; id: string } | null>(null);

  const showToast = useCallback((msg: string) => {
    const id = `t_${Date.now()}`;
    setToast({ message: msg, id });
    setTimeout(() => setToast(null), 2400);
  }, []);

  const loadFriends = useCallback(async () => {
    setLoadingFriends(true);
    try {
      const list = await getSavedFriends();
      setFriends(list);
    } finally {
      setLoadingFriends(false);
    }
  }, []);

  useEffect(() => {
    void loadFriends();
  }, [loadFriends]);

  const toggleFriend = useCallback((id: string) => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      await removeFriendFromService(id);
      await removeFriendFromCtx(id);
      setSelectedFriendIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      await loadFriends();
    },
    [removeFriendFromCtx, loadFriends],
  );

  const searchLower = friendSearchQuery.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      searchLower
        ? friends.filter(
            (f) =>
              f.name.toLowerCase().includes(searchLower) ||
              f.phoneNumber.toLowerCase().includes(searchLower),
          )
        : friends,
    [friends, searchLower],
  );
  const displayed = friendsExpanded ? filtered : filtered.slice(0, FRIENDS_VISIBLE_COUNT);
  const hasMore = filtered.length > FRIENDS_VISIBLE_COUNT;
  const selected = friends.filter((f) => selectedFriendIds.has(f.id));

  const handleStart = useCallback(async () => {
    if (selected.length === 0) {
      showToast('Select at least one friend first.');
      return;
    }
    setStarting(true);
    try {
      const hostId = currentUser?.id ?? userProfile?.id ?? 'unknown';
      const hostName =
        userProfile?.fullName ||
        `${userProfile?.firstName ?? ''} ${userProfile?.lastName ?? ''}`.trim() ||
        'Host';
      const hostPhone = userProfile?.mobileNumber ?? '';

      const session = await createSharedSession({
        hostId,
        participants: [
          {
            userId: hostId,
            name: hostName,
            phoneNumber: hostPhone,
            role: 'HOST',
            allocatedBudget: 0,
            spentAmount: 0,
            remainingBudget: 0,
            joinedAt: new Date().toISOString() },
          ...selected.map((f) => ({
            userId: f.id,
            name: f.name,
            phoneNumber: f.phoneNumber,
            role: 'MEMBER' as const,
            allocatedBudget: 0,
            spentAmount: 0,
            remainingBudget: 0,
            joinedAt: new Date().toISOString() })),
        ] });

      const invitedIds = selected.map((f) => f.id);
      emitSessionInvite(session, invitedIds);
      joinSessionRoom(session.id, hostId);

      navigation.navigate('ActiveSharedSession', { sessionId: session.id });
    } catch (e: unknown) {
      showToast((e as Error)?.message ?? t('sharedCart.err_start_session'));
    } finally {
      setStarting(false);
    }
  }, [selected, currentUser, userProfile, emitSessionInvite, joinSessionRoom, navigation, showToast, t]);

  const headerSubtitle = useMemo(() => {
    if (selected.length === 0) {
      if (friends.length === 0) return t('sharedCartSetup.subtitle_no_selected_no_saved');
      return t('sharedCart.subtitle_saved_invite_short', { count: friends.length });
    }
    return selected.length === 1
      ? t('sharedCart.selected_one', { count: selected.length })
      : t('sharedCart.selected_other', { count: selected.length });
  }, [selected.length, friends.length, t]);

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
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <SharedCartHeader onBack={() => navigation.goBack()} subtitle={headerSubtitle} />

          <Animated.View entering={FadeInDown.delay(40).duration(300)} style={styles.qrRow}>
            <GlassButton
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
              title={t('sharedCart.scan_qr')}
              variant="outline"
              size="md"
              style={styles.qrBtn}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowScanQr(true);
              }}
              icon={<Ionicons name="scan-outline" size={20} color={Colors.accent.primary} />}
              accessibilityLabel={t('sharedCartSetup.scan_friend_a11y')}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(70).duration(300)}>
            <GlassCard style={styles.sectionCard} padding={Spacing.lg}>
              <Text style={[styles.cardTitle, { color: C.text }]}>{t('sharedCart.friends_title')}</Text>
              <Text style={[styles.cardHint, { color: C.textSecondary }]}>{t('sharedCart.friends_hint_session')}</Text>

              <TextInput
                style={[
                  styles.searchInput,
                  {
                    color: C.text,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                    borderColor: C.borderSubtle },
                ]}
                placeholder={t('sharedCart.search_placeholder')}
                placeholderTextColor={C.textTertiary}
                value={friendSearchQuery}
                onChangeText={setFriendSearchQuery}
              />

              {loadingFriends ? (
                <ActivityIndicator color={Colors.accent.primary} style={{ marginVertical: Spacing.lg }} />
              ) : friends.length === 0 ? (
                <Animated.View entering={FadeIn.delay(120).duration(320)} style={styles.emptyInline}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="people-outline" size={32} color={Colors.accent.primary} />
                  </View>
                  <Text style={[styles.emptyInlineText, { color: C.textSecondary }]}>
                    {t('sharedCart.friends_empty_session')}
                  </Text>
                </Animated.View>
              ) : filtered.length === 0 ? (
                <Text style={[styles.emptyText, { color: C.textSecondary }]}>{t('sharedCart.no_search_match')}</Text>
              ) : (
                <>
                  {displayed.map((f) => (
                    <View key={f.id}>
                      <FriendListItem
                        friend={{ id: f.id, name: f.name, phone: f.phoneNumber, avatar: '' } as any}
                        selected={selectedFriendIds.has(f.id)}
                        onToggle={() => toggleFriend(f.id)}
                        onDelete={() => void handleDelete(f.id)}
                      />
                    </View>
                  ))}
                  {hasMore && (
                    <GlassButton
                      title={friendsExpanded ? t('sharedCart.show_less') : t('sharedCart.show_all', { count: filtered.length })}
                      variant="ghost"
                      size="sm"
                      onPress={() => setFriendsExpanded((p) => !p)}
                      style={{ marginTop: Spacing.sm }}
                    />
                  )}
                </>
              )}
            </GlassCard>
          </Animated.View>
        </ScrollView>

        <View style={styles.footerBlock}>
          <GlassCard style={styles.ctaCard} padding={Spacing.lg}>
            <Text style={[styles.ctaHint, { color: C.textSecondary }]}>
              {selected.length === 0 ? t('sharedCart.cta_need_friend_session') : t('sharedCart.cta_ready_when')}
            </Text>
            <GlassButton
              title={starting ? t('sharedCart.starting') : t('sharedCart.start_shared')}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                void handleStart();
              }}
              variant="fill"
              size="lg"
              disabled={selected.length === 0 || starting}
              style={styles.startBtn}
              accessibilityLabel={t('sharedCartSetup.start_shared_a11y')}
            />
          </GlassCard>
        </View>

        <View style={{ paddingBottom: Math.max(insets.bottom, Spacing.md) }}>
          <AppFooter />
        </View>
      </View>

      <FriendQRModal visible={showMyQr} onClose={() => setShowMyQr(false)} getOrCreateMe={getOrCreateMe} />
      <FriendQRScannerModal
        visible={showScanQr}
        onClose={() => {
          setShowScanQr(false);
          void loadFriends();
        }}
      />
    </View>
  );
};

export default SharedCartScreen;

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
  searchInput: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.base,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1 },
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
  emptyText: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    marginBottom: Spacing.md,
    textAlign: 'center' },
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
    width: '100%' } });