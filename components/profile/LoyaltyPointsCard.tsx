import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useResolvedTheme } from '../../context/ThemeContext';
import GlassCard from '../GlassCard';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useTranslation } from 'react-i18next';

interface LoyaltyPointsCardProps {
  points: number;
  style?: ViewStyle;
}

export default function LoyaltyPointsCard({ points, style }: LoyaltyPointsCardProps) {
  const { isDark, colors: C } = useResolvedTheme();
  const { t } = useTranslation();

  const iconBg = isDark ? 'rgba(0,122,255,0.22)' : 'rgba(0,122,255,0.12)';

  return (
    <GlassCard
      style={StyleSheet.flatten([
        styles.card,
        { borderColor: isDark ? `${Colors.accent.primary}40` : `${Colors.accent.primary}30` },
        style,
      ])}
      padding={Spacing.lg}
    >
      <View style={styles.inner}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name="ribbon-outline" size={26} color={Colors.accent.primary} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.label, { color: C.textSecondary }]}>{t('loyaltyCard.label')}</Text>
          <Text style={[styles.points, { color: C.text }]}>{points.toLocaleString()}</Text>
          <Text style={[styles.hint, { color: C.textTertiary }]}>{t('loyaltyCard.hint')}</Text>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    borderWidth: 1 },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-start' },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    marginRight: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center' },
  textWrap: {
    flex: 1 },
  label: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    marginBottom: 4,
    letterSpacing: 0.6,
    textTransform: 'uppercase' },
  points: {
    fontFamily: Typography.fonts.accentBold,
    fontSize: Typography.sizes['3xl'],
    fontWeight: '700',
    letterSpacing: -0.5 },
  hint: {
    marginTop: Spacing.xs,
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.xs,
    lineHeight: 16 } });
