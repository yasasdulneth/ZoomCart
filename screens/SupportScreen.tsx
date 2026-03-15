import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  Pressable,
  Linking,
  Alert,
  Platform,
  ToastAndroid,
} from 'react-native';
import { useResolvedTheme } from '../context/ThemeContext';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { Typography, Spacing, BorderRadius, Colors } from '../constants/theme';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

const SUPPORT_EMAIL = 'support@zoomcart.app';

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

const FAQ_KEYS = [
  { q: 'support.faq1_q', a: 'support.faq1_a' },
  { q: 'support.faq2_q', a: 'support.faq2_a' },
  { q: 'support.faq3_q', a: 'support.faq3_a' },
  { q: 'support.faq4_q', a: 'support.faq4_a' },
] as const;

function openMail(prefillSubject: string, t: TFunction) {
  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(prefillSubject)}`;
  void Linking.canOpenURL(url).then((ok) => {
    if (ok) void Linking.openURL(url);
    else {
      Alert.alert(t('support.email_alert_title'), t('support.email_alert_body', { email: SUPPORT_EMAIL }));
    }
  });
}

export default function SupportScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark, colors: C } = useResolvedTheme();

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

  const onContact = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    openMail(t('support.mail_subject_contact'), t);
  }, [t]);

  const onReport = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    openMail(t('support.mail_subject_report'), t);
  }, [t]);

  const accentIconBg = isDark ? 'rgba(0,122,255,0.16)' : 'rgba(0,122,255,0.10)';
  const outlineBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Animated.View entering={FadeInDown.duration(380)} style={StyleSheet.absoluteFill}>
        <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <FloatingOrb size={260} color={orbBlue} top={-100} left={-80} driftX={[0, 12]} driftY={[0, 10]} duration={7200} />
        <FloatingOrb
          size={200}
          color={orbPurple}
          top={380}
          right={-50}
          driftX={[0, -10]}
          driftY={[0, 12]}
          duration={8000}
        />
        <FloatingOrb size={160} color={orbTeal} top={120} right={-30} driftX={[0, 8]} driftY={[0, -10]} duration={7600} />
        <View pointerEvents="none" style={StyleSheet.absoluteFill} />
      </Animated.View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.md,
            paddingBottom: insets.bottom + 120,
            paddingHorizontal: Spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(320)}>
          <Text style={[styles.kicker, { color: C.textSecondary }]}>{t('support.kicker')}</Text>
          <Text style={[styles.title, { color: C.text }]}>{t('support.title')}</Text>
          <Text style={[styles.subtitle, { color: C.textSecondary }]}>{t('support.subtitle')}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(50).duration(320)} style={styles.quickRow}>
          <Pressable
            onPress={onContact}
            accessibilityRole="button"
            accessibilityLabel={t('support.contact_a11y')}
            style={({ pressed }) => [styles.quickCardWrap, pressed && { opacity: 0.92 }]}
          >
            <GlassCard style={styles.quickCard}>
              <View style={[styles.quickIcon, { backgroundColor: accentIconBg }]}>
                <Ionicons name="mail-outline" size={22} color={Colors.accent.primary} />
              </View>
              <View style={styles.quickTextCol}>
                <Text style={[styles.quickTitle, { color: C.text }]}>{t('support.contact_title')}</Text>
                <Text style={[styles.quickSub, { color: C.textSecondary }]} numberOfLines={2}>
                  {t('support.contact_sub')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={C.textTertiary} />
            </GlassCard>
          </Pressable>

          <Pressable
            onPress={onReport}
            accessibilityRole="button"
            accessibilityLabel={t('support.report_a11y')}
            style={({ pressed }) => [styles.quickCardWrap, pressed && { opacity: 0.92 }]}
          >
            <GlassCard style={styles.quickCard}>
              <View style={[styles.quickIcon, { backgroundColor: isDark ? 'rgba(255,59,48,0.14)' : 'rgba(255,59,48,0.10)' }]}>
                <Ionicons name="warning-outline" size={22} color={Colors.accent.red} />
              </View>
              <View style={styles.quickTextCol}>
                <Text style={[styles.quickTitle, { color: C.text }]}>{t('support.report_title')}</Text>
                <Text style={[styles.quickSub, { color: C.textSecondary }]} numberOfLines={2}>
                  {t('support.report_sub')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={C.textTertiary} />
            </GlassCard>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(90).duration(320)}>
          <View style={styles.sectionHead}>
            <GlassBadge label={t('support.faq_badge')} variant="accent" size="sm" />
            <Text style={[styles.sectionHint, { color: C.textSecondary }]}>{t('support.faq_hint')}</Text>
          </View>
        </Animated.View>

        {FAQ_KEYS.map((item, index) => (
          <Animated.View key={item.q} entering={FadeInDown.delay(120 + index * 45).duration(300)}>
            <GlassCard style={styles.faqCard}>
              <Text style={[styles.faqQ, { color: C.text }]}>{t(item.q)}</Text>
              <Text style={[styles.faqA, { color: C.textSecondary }]}>{t(item.a)}</Text>
            </GlassCard>
          </Animated.View>
        ))}

        <Animated.View entering={FadeInDown.delay(120 + FAQ_KEYS.length * 45).duration(300)}>
          <GlassCard style={styles.guidanceCard}>
            <View style={styles.guidanceTop}>
              <View style={[styles.guidanceIcon, { borderColor: outlineBorder }]}>
                <Ionicons name="book-outline" size={24} color={Colors.accent.secondary} />
              </View>
              <View style={styles.guidanceTextCol}>
                <Text style={[styles.guidanceTitle, { color: C.text }]}>{t('support.guidance_title')}</Text>
                <Text style={[styles.guidanceBody, { color: C.textSecondary }]}>{t('support.guidance_body')}</Text>
              </View>
            </View>
            <GlassButton
              title={t('support.copy_email')}
              variant="outline"
              size="md"
              onPress={() => {
                void Haptics.selectionAsync();
                void Clipboard.setStringAsync(SUPPORT_EMAIL).then(() => {
                  if (Platform.OS === 'android') {
                    ToastAndroid.show(t('common.email_copied_android'), ToastAndroid.SHORT);
                  } else {
                    Alert.alert(t('common.copied'), SUPPORT_EMAIL);
                  }
                });
              }}
              accessibilityLabel={t('support.copy_email_a11y')}
              accessibilityHint={t('support.copy_hint')}
            />
          </GlassCard>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  orb: { position: 'absolute' },
  content: {},
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
    marginBottom: Spacing.lg,
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.base,
    lineHeight: 22 },
  quickRow: { gap: Spacing.md, marginBottom: Spacing.lg },
  quickCardWrap: {},
  quickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center' },
  quickTextCol: { flex: 1 },
  quickTitle: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
    fontWeight: '600' },
  quickSub: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    marginTop: 2,
    lineHeight: 18 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md },
  sectionHint: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm },
  faqCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg },
  faqQ: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.lg,
    marginBottom: Spacing.sm,
    lineHeight: 24 },
  faqA: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    lineHeight: 20 },
  guidanceCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.sm,
    gap: Spacing.md },
  guidanceTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md },
  guidanceIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(88,86,214,0.08)' },
  guidanceTextCol: { flex: 1 },
  guidanceTitle: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.lg,
    marginBottom: Spacing.xs },
  guidanceBody: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    lineHeight: 20 } });
