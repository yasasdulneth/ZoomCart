import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Colors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';

interface SharedCartHeaderProps {
  onBack: () => void;
  /** e.g. "Group shop" */
  kicker?: string;
  /** Main title, default "Shared cart" */
  title?: string;
  /** Second line under title, e.g. selection count */
  subtitle: string;
  /** Optional right column (e.g. sync badge on live session) */
  trailing?: React.ReactNode;
}

export default function SharedCartHeader({
  onBack,
  kicker,
  title,
  subtitle,
  trailing,
}: SharedCartHeaderProps) {
  const { colors: C, resolvedTheme } = useTheme();
  const { t } = useTranslation();
  const isDark = resolvedTheme === 'dark';
  const pillBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const pillBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

  const kickerText = kicker ?? t('sharedHeader.default_kicker');
  const titleText = title ?? t('sharedHeader.default_title');

  return (
    <View style={styles.row}>
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
        accessibilityLabel={t('sharedHeader.go_back_a11y')}
      >
        <Ionicons name="chevron-back" size={22} color={Colors.accent.primary} />
      </Pressable>
      <View style={styles.textCol}>
        <View style={styles.titleRow}>
          <View style={styles.titleStack}>
            <Text style={[styles.kicker, { color: C.textSecondary }]}>{kickerText}</Text>
            <Text style={[styles.title, { color: C.text }]}>{titleText}</Text>
            <Text style={[styles.subtitle, { color: C.textSecondary }]}>{subtitle}</Text>
          </View>
          {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  backPill: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  textCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  titleStack: {
    flex: 1,
    minWidth: 0,
  },
  trailing: {
    marginTop: 2,
  },
  kicker: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 4,
    opacity: 0.9,
  },
  title: {
    fontFamily: Typography.fonts.accentBold,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.35,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
  },
});
