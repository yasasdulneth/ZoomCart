import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, ScrollView, Pressable, useColorScheme } from 'react-native';
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
import { useTheme, type ThemePreference } from '../context/ThemeContext';
import SharedCartHeader from '../components/sharedCart/SharedCartHeader';
import GlassCard from '../components/GlassCard';
import AppFooter from '../components/AppFooter';
import { LanguageSettingsRow } from '../components/LanguageSelect';

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
        motion,
      ]}
    />
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation<RootStackNavigationProp<'Settings'>>();
  const insets = useSafeAreaInsets();
  const deviceScheme = useColorScheme();
  const { t, i18n } = useTranslation();
  const { preference, setPreference, resolvedTheme, colors: C } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const themeChoices = useMemo(
    () =>
      [
        {
          value: 'dark' as ThemePreference,
          label: t('settings.theme_dark'),
          description: t('settings.theme_darkDesc'),
          icon: 'moon' as keyof typeof Ionicons.glyphMap,
        },
        {
          value: 'light' as ThemePreference,
          label: t('settings.theme_light'),
          description: t('settings.theme_lightDesc'),
          icon: 'sunny' as keyof typeof Ionicons.glyphMap,
        },
        {
          value: 'auto' as ThemePreference,
          label: t('settings.theme_auto'),
          description: t('settings.theme_autoDesc'),
          icon: 'phone-portrait-outline' as keyof typeof Ionicons.glyphMap,
        },
      ] as const,
    [t, i18n.language],
  );

  const bgColors = useMemo<[string, string, string]>(
    () => (isDark ? ['#0A0A0F', '#0D1117', '#0A0E1A'] : ['#EEF2FF', '#F5F0FF', '#EFF6FF']),
    [isDark],
  );
  const orbBlue = isDark ? 'rgba(0,122,255,0.18)' : 'rgba(0,122,255,0.10)';
  const orbPurple = isDark ? 'rgba(175,82,222,0.14)' : 'rgba(175,82,222,0.08)';
  const orbTeal = isDark ? 'rgba(50,215,175,0.10)' : 'rgba(50,215,175,0.07)';

  const headerSubtitle = useMemo(() => {
    if (preference === 'auto') {
      const sysLabel =
        deviceScheme === 'light' ? t('settings.theme_light') : t('settings.theme_dark');
      return t('settings.subtitle_system', { mode: sysLabel });
    }
    return preference === 'dark' ? t('settings.subtitle_darkLocked') : t('settings.subtitle_lightLocked');
  }, [preference, deviceScheme, t, i18n.language]);

  const onPickTheme = (p: ThemePreference) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void setPreference(p);
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

      <View style={[styles.body, { paddingTop: insets.top, paddingHorizontal: Spacing.lg }]}>
        <SharedCartHeader
          onBack={() => navigation.goBack()}
          kicker={t('settings.kicker')}
          title={t('settings.title')}
          subtitle={headerSubtitle}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.delay(20).duration(300)}>
            <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>{t('settings.language')}</Text>
            <GlassCard style={styles.themeCard} padding={Spacing.md}>
              <LanguageSettingsRow />
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(40).duration(300)} style={{ marginTop: Spacing.xl }}>
            <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>{t('settings.appearance')}</Text>
            <GlassCard style={styles.themeCard} padding={Spacing.md}>
              {themeChoices.map((opt) => {
                const selected = preference === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => onPickTheme(opt.value)}
                    style={({ pressed }) => [
                      styles.themeRow,
                      {
                        backgroundColor: selected
                          ? Colors.accent.primary + (isDark ? '22' : '18')
                          : 'transparent',
                        borderColor: selected ? Colors.accent.primary + '55' : C.border,
                        opacity: pressed ? 0.92 : 1,
                      },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${opt.label}. ${opt.description}`}
                  >
                    <View style={[styles.themeIconWrap, { backgroundColor: C.surface + '99' }]}>
                      <Ionicons name={opt.icon} size={22} color={selected ? Colors.accent.primary : C.textSecondary} />
                    </View>
                    <View style={styles.themeTextCol}>
                      <Text style={[styles.themeTitle, { color: C.text }]}>{opt.label}</Text>
                      <Text style={[styles.themeDesc, { color: C.textSecondary }]}>{opt.description}</Text>
                    </View>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={24} color={Colors.accent.primary} />
                    ) : (
                      <View style={[styles.radioOuter, { borderColor: C.textTertiary + '55' }]} />
                    )}
                  </Pressable>
                );
              })}
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(300)} style={{ marginTop: Spacing.xl }}>
            <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>{t('settings.legal')}</Text>
            <GlassCard style={styles.themeCard} padding={Spacing.md}>
              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate('PrivacyPolicy');
                }}
                style={({ pressed }) => [
                  styles.themeRow,
                  {
                    backgroundColor: 'transparent',
                    borderColor: C.border,
                    opacity: pressed ? 0.92 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${t('settings.privacy_title')}. ${t('settings.privacy_desc')}`}
              >
                <View style={[styles.themeIconWrap, { backgroundColor: C.surface + '99' }]}>
                  <Ionicons name="document-text-outline" size={22} color={Colors.accent.primary} />
                </View>
                <View style={styles.themeTextCol}>
                  <Text style={[styles.themeTitle, { color: C.text }]}>{t('settings.privacy_title')}</Text>
                  <Text style={[styles.themeDesc, { color: C.textSecondary }]}>
                    {t('settings.privacy_desc')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={C.textSecondary} />
              </Pressable>
            </GlassCard>
          </Animated.View>

          <View style={{ marginTop: Spacing.xl }}>
            <AppFooter />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  orb: { position: 'absolute' },
  body: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: Spacing.md,
  },
  sectionLabel: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.sm,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    marginLeft: 2,
  },
  themeCard: {
    borderRadius: BorderRadius.xl,
    gap: Spacing.xs,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  themeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeTextCol: {
    flex: 1,
    gap: 2,
  },
  themeTitle: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
  },
  themeDesc: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
});
