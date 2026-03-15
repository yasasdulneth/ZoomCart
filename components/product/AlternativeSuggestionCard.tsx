import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import type { CheaperAlternative } from '../../lib/api/products';

const GREEN_HIGHLIGHT = '#22C55E';

interface AlternativeSuggestionCardProps {
  alternative: CheaperAlternative;
  currentPrice: number;
}

export default function AlternativeSuggestionCard({
  alternative,
  currentPrice,
}: AlternativeSuggestionCardProps) {
  const difference = currentPrice - alternative.price;
  const saved = difference > 0;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>CHEAPER ALTERNATIVE</Text>
      <Text style={styles.name} numberOfLines={2}>
        {alternative.name}
      </Text>
      <View style={styles.priceRow}>
        <Text style={styles.price}>LKR {alternative.price.toFixed(2)}</Text>
        {alternative.store ? (
          <Text style={styles.store}> · {alternative.store}</Text>
        ) : null}
      </View>
      {saved && (
        <View style={styles.differenceWrap}>
          <Text style={styles.differenceLabel}>You save </Text>
          <Text style={styles.differenceValue}>LKR {difference.toFixed(2)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderColor: 'rgba(255,255,255,0.06)',
    borderLeftColor: GREEN_HIGHLIGHT,
  },
  sectionLabel: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.xs,
    color: Colors.dark.textTertiary,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  name: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
    color: Colors.dark.text,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: Spacing.xs,
  },
  price: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: Typography.sizes.lg,
    color: GREEN_HIGHLIGHT,
  },
  store: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    color: Colors.dark.textSecondary,
    marginLeft: Spacing.xs,
  },
  differenceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  differenceLabel: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    color: Colors.dark.textSecondary,
  },
  differenceValue: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: Typography.sizes.sm,
    color: GREEN_HIGHLIGHT,
  },
});
