import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigationProp } from '../types/navigation';
import { Typography, Spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import SharedCartHeader from '../components/sharedCart/SharedCartHeader';
import { PRIVACY_POLICY_BLOCKS } from '../constants/privacyPolicy';
import { useTranslation } from 'react-i18next';

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation<RootStackNavigationProp<'PrivacyPolicy'>>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { resolvedTheme, colors: C } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <LinearGradient
        colors={
          isDark ? ['#0A0A0F', '#0D1117'] : ['#EEF2FF', '#F5F0FF']
        }
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={[styles.body, { paddingTop: insets.top, paddingHorizontal: Spacing.lg }]}>
        <SharedCartHeader
          onBack={() => navigation.goBack()}
          kicker={t('privacy.kicker')}
          title={t('privacy.title')}
          subtitle={t('privacy.subtitle')}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, Spacing.xl) + 24 },
          ]}
          showsVerticalScrollIndicator
        >
          <Animated.View entering={FadeInDown.delay(40).duration(280)}>
            {PRIVACY_POLICY_BLOCKS.map((block, index) => {
              if (block.kind === 'divider') {
                return (
                  <View
                    key={`d-${index}`}
                    style={[styles.rule, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)' }]}
                  />
                );
              }
              if (block.kind === 'title') {
                return (
                  <Text key={`t-${index}`} style={[styles.docTitle, { color: C.text }]}>
                    {block.text}
                  </Text>
                );
              }
              if (block.kind === 'heading') {
                return (
                  <Text key={`h-${index}`} style={[styles.h2, { color: C.text }]}>
                    {block.text}
                  </Text>
                );
              }
              if (block.kind === 'bullets') {
                return (
                  <View key={`b-${index}`} style={styles.bulletBlock}>
                    {block.items.map((item, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <Text style={[styles.bulletGlyph, { color: C.textSecondary }]}>•</Text>
                        <Text style={[styles.bulletText, { color: C.text }]}>{item}</Text>
                      </View>
                    ))}
                  </View>
                );
              }
              return (
                <Text key={`p-${index}`} style={[styles.paragraph, { color: C.text }]}>
                  {block.text}
                </Text>
              );
            })}
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: Spacing.md,
  },
  docTitle: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: Spacing.md,
  },
  h2: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
    fontWeight: '700',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    letterSpacing: -0.2,
  },
  paragraph: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    lineHeight: 22,
    marginBottom: Spacing.md,
    opacity: 0.92,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.lg,
  },
  bulletBlock: {
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingRight: Spacing.sm,
  },
  bulletGlyph: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    lineHeight: 22,
    marginTop: 0,
    width: 14,
  },
  bulletText: {
    flex: 1,
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    lineHeight: 22,
    opacity: 0.92,
  },
});
