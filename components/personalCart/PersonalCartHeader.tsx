import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useResolvedTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius, Colors } from '../../constants/theme';
import { useTranslation } from 'react-i18next';

interface PersonalCartHeaderProps {
  itemCount: number;
  onBack: () => void;
  /** Read-only receipt from checkout history */
  receipt?: { title: string; dateLine: string };
}

export default function PersonalCartHeader({ itemCount, onBack, receipt }: PersonalCartHeaderProps) {
  const { isDark, colors: C } = useResolvedTheme();
  const { t } = useTranslation();
  const pillBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const pillBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

  const kicker = receipt ? t('personalCart.history_kicker') : t('cartHeader.kicker');
  const title = receipt ? receipt.title : t('cartHeader.title');
  const subtitle = receipt
    ? receipt.dateLine
    : `${itemCount} ${itemCount === 1 ? t('cartHeader.item_one') : t('cartHeader.item_other')}`;

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
        accessibilityLabel={t('profile.go_back_a11y')}
      >
        <Ionicons name="chevron-back" size={22} color={Colors.accent.primary} />
      </Pressable>
      <View style={styles.textCol}>
        <Text style={[styles.kicker, { color: C.textSecondary }]}>{kicker}</Text>
        <Text style={[styles.title, { color: C.text }]} numberOfLines={receipt ? 2 : 1}>
          {title}
        </Text>
        <Text style={[styles.subtitle, { color: C.textSecondary }]} numberOfLines={receipt ? 2 : 1}>
          {subtitle}
        </Text>
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
