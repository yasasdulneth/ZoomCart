import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, BorderRadius } from '../../constants/theme';

export default function BudgetProgressBar({
  spent,
  budget,
}: {
  spent: number;
  budget: number;
}) {
  const ratio = useMemo(() => {
    if (!Number.isFinite(budget) || budget <= 0) return 0;
    return Math.max(0, Math.min(1, spent / budget));
  }, [spent, budget]);

  const fillColor =
    ratio >= 0.95 ? Colors.accent.tertiary : ratio >= 0.8 ? Colors.accent.neon : Colors.accent.primary;

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: fillColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: BorderRadius.md,
  },
});

