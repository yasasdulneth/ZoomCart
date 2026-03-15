import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
 
  ActivityIndicator,
  Alert } from 'react-native';
import { useResolvedTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import GlassButton from '../components/GlassButton';
import AppFooter from '../components/AppFooter';
import { ZoomCartLogo } from '../components/ZoomCartLogo';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows } from '../constants/theme';
import type { RootStackParamList } from '../types/navigation';
import { formatLkr } from '../lib/utils/currency';
import { calculateEarnedPoints } from '../lib/services/loyalty.service';
import { shareSessionReceiptPdf } from '../lib/receipt/sessionReceiptPdf';
import { suppressSharedSessionForLiveUi } from '../lib/services/sharedSession.service';
import { useAuth } from '../context/AuthContext';

type Props = RouteProp<RootStackParamList, 'SessionReceipt'>;

export default function SessionReceiptScreen() {
  const navigation = useNavigation();
  const route = useRoute<Props>();
  const { isDark, colors: C } = useResolvedTheme();
  const auth = useAuth();

  const {
    sessionId,
    createdAt,
    endedAt,
    customerName,
    items,
    totalAmount,
    participantCount } = route.params;

  const [saving, setSaving] = useState(false);

  const earnedPts = useMemo(() => calculateEarnedPoints(totalAmount), [totalAmount]);
  const profilePts = Number((auth.userProfile as { loyaltyPoints?: number })?.loyaltyPoints ?? 0);

  useEffect(() => {
    void suppressSharedSessionForLiveUi(sessionId);
  }, [sessionId]);

  const lineQty = useMemo(
    () => items.reduce((s, i) => s + i.quantity, 0),
    [items],
  );

  const handleSavePdf = useCallback(async () => {
    setSaving(true);
    try {
      await shareSessionReceiptPdf({
        sessionId,
        createdAt,
        endedAt,
        customerName,
        items,
        totalAmount,
        participantCount,
        profileZoomPoints: profilePts });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert('Could not create PDF', e instanceof Error ? e.message : 'Try again.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  }, [
    sessionId,
    createdAt,
    endedAt,
    customerName,
    items,
    totalAmount,
    participantCount,
    profilePts,
  ]);

  const bgColors: [string, string, string] = isDark
    ? ['#0A0A0F', '#0D1117', '#0A0E1A']
    : ['#EEF2FF', '#F5F0FF', '#EFF6FF'];

  const scrollBody = [
    <Animated.View
      key="hero"
      entering={FadeInDown.duration(380)}
      style={styles.hero}
      children={[
        <View key="logo" style={styles.logoWrap} children={<ZoomCartLogo style={styles.logo} />} />,
        <Text key="title" style={[styles.title, { color: C.text }]}>
          Session complete
        </Text>,
        <Text key="sub" style={[styles.sub, { color: C.textSecondary }]}>
          Here&apos;s a summary you can save as a polished PDF receipt.
        </Text>,
      ]}
    />,
    <Animated.View
      key="card"
      entering={FadeInDown.delay(80).duration(400)}
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(28,28,30,0.72)' : 'rgba(255,255,255,0.92)',
          borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(60,60,67,0.12)' },
      ]}
      children={[
        <Text key="eyebrow" style={[styles.cardEyebrow, { color: C.textSecondary }]}>
          Shared session
        </Text>,
        <Text key="amount" style={[styles.amount, { color: Colors.accent.green }]}>
          {formatLkr(totalAmount)}
        </Text>,
        <View
          key="meta"
          style={styles.meta}
          children={[
            <Text key="meta1" style={[styles.metaText, { color: C.textSecondary }]}>
              {items.length} product lines · {lineQty} units · {participantCount} participants
            </Text>,
            <Text key="meta2" style={[styles.metaMuted, { color: C.textTertiary }]} numberOfLines={2}>
              ID {sessionId}
            </Text>,
          ]}
        />,
        <View
          key="pts"
          style={[styles.pointsBanner, { borderColor: 'rgba(255,214,10,0.35)' }]}
          children={[
            <Text key="pemoji" style={styles.pointsEmoji}>
              ⭐
            </Text>,
            <View
              key="pcol"
              style={{ flex: 1 }}
              children={[
                <Text key="plab" style={[styles.pointsLabel, { color: C.textSecondary }]}>
                  Eligible ZOOMPOINTS
                </Text>,
                <Text key="pval" style={[styles.pointsValue, { color: C.text }]}>
                  {earnedPts.toLocaleString()} pts
                </Text>,
                <Text key="phint" style={[styles.pointsHint, { color: C.textTertiary }]}>
                  1 pt per LKR 100 — credited after checkout when applicable. Balance:{' '}
                  {profilePts.toLocaleString()} pts
                </Text>,
              ]}
            />,
          ]}
        />,
      ]}
    />,
    <Animated.View
      key="actions"
      entering={FadeInDown.delay(140).duration(420)}
      style={styles.actions}
      children={[
        <GlassButton
          key="pdf"
          title={saving ? 'Preparing PDF…' : 'Save PDF receipt'}
          onPress={() => void handleSavePdf()}
          variant="fill"
          size="lg"
          loading={saving}
          disabled={saving}
          style={styles.primaryBtn}
          accessibilityLabel="Save receipt as PDF"
        />,
        <GlassButton
          key="home"
          title="Back to Home"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            (navigation.navigate as any)('Home');
          }}
          variant="outline"
          size="lg"
          accessibilityLabel="Return home"
        />,
      ]}
    />,
    ...(saving
      ? [
          <ActivityIndicator
            key="saving"
            color={Colors.accent.primary}
            style={{ marginTop: Spacing.md }}
          />,
        ]
      : []),
    <AppFooter key="footer" />,
  ];

  return (
    <View
      style={[styles.root, { backgroundColor: C.background }]}
      children={[
        <LinearGradient
          key="bg"
          colors={bgColors}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />,
        <SafeAreaView
          key="safe"
          style={styles.safe}
          children={[
            <ScrollView
              key="scroll"
              contentContainerStyle={styles.scroll}
              showsVerticalScrollIndicator={false}
              children={scrollBody}
            />,
          ]}
        />,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['2xl'] },
  hero: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg },
  logoWrap: {
    marginBottom: Spacing.md,
    ...Shadows.md },
  logo: {
    width: 72,
    height: 72 },
  title: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: 26,
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: 'center' },
  sub: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: Spacing.md },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.lg },
  cardEyebrow: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6 },
  amount: {
    fontFamily: Typography.fonts.accentBold,
    fontSize: 36,
    fontWeight: '700',
    marginBottom: Spacing.sm },
  meta: {
    gap: 6,
    marginBottom: Spacing.md },
  metaText: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 14 },
  metaMuted: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 11 },
  pointsBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    backgroundColor: 'rgba(255,214,10,0.08)' },
  pointsEmoji: {
    fontSize: 22,
    marginTop: 2 },
  pointsLabel: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 12,
    marginBottom: 2 },
  pointsValue: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: 22,
    marginBottom: 4 },
  pointsHint: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 11,
    lineHeight: 16 },
  actions: {
    gap: Spacing.sm },
  primaryBtn: {
    width: '100%' } });
