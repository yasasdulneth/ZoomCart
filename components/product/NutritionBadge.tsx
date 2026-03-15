import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import type { ProductNutrition } from '../../lib/api/products';

export type HealthIndicator = 'good' | 'moderate' | 'consider';

interface NutritionBadgeProps {
  nutrition: ProductNutrition;
}

function getHealthIndicator(nutrition: ProductNutrition): HealthIndicator {
  const cal = nutrition.calories ?? 0;
  const sugarG = parseFloat((nutrition.sugar ?? '0').replace(/\D/g, '')) || 0;
  if (cal <= 100 && sugarG <= 5) return 'good';
  if (cal <= 250 && sugarG <= 15) return 'moderate';
  return 'consider';
}

function getBadgeLabel(indicator: HealthIndicator): string {
  switch (indicator) {
    case 'good':
      return 'Good choice';
    case 'moderate':
      return 'Moderate';
    case 'consider':
      return 'Consider alternatives';
    default:
      return 'Nutrition info';
  }
}

export default function NutritionBadge({ nutrition }: NutritionBadgeProps) {
  const indicator = getHealthIndicator(nutrition);
  const label = getBadgeLabel(indicator);

  const backgroundColor =
    indicator === 'good'
      ? 'rgba(34, 197, 94, 0.18)'
      : indicator === 'moderate'
        ? 'rgba(234, 179, 8, 0.18)'
        : 'rgba(255, 255, 255, 0.06)';
  const textColor =
    indicator === 'good'
      ? '#4ADE80'
      : indicator === 'moderate'
        ? '#FACC15'
        : Colors.dark.textSecondary;

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: Typography.fonts.secondaryMedium,
    fontSize: Typography.sizes.xs,
    letterSpacing: 0.3,
  },
});
