import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useResolvedTheme } from '../../context/ThemeContext';
import GlassCard from '../GlassCard';
import BudgetProgressBar from './BudgetProgressBar';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { formatLkr } from '../../lib/utils/currency';

export default function ParticipantBudgetCard({
  name,
  role,
  allocatedBudget,
  spentAmount,
  remainingBudget,
  highlight }: {
  name: string;
  role: 'HOST' | 'MEMBER';
  allocatedBudget: number;
  spentAmount: number;
  remainingBudget: number;
  highlight?: 'warning' | 'danger' | 'none';
}) {
  const { isDark, colors: C } = useResolvedTheme();

  const unlimited = useMemo(() => !(allocatedBudget > 0), [allocatedBudget]);
  const budgetText = unlimited ? 'Unlimited' : formatLkr(allocatedBudget);

  const spentText = formatLkr(spentAmount);
  const remainingText = unlimited ? 'Unlimited' : formatLkr(remainingBudget);

  const badge = role === 'HOST' ? 'HOST' : 'MEMBER';
  const toneBorder =
    highlight === 'danger'
      ? { borderColor: 'rgba(255,59,48,0.45)' }
      : highlight === 'warning'
        ? { borderColor: 'rgba(255,159,10,0.5)' }
        : { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' };

  return (
    <GlassCard style={[styles.card, { borderWidth: 1, ...toneBorder }]}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.roleBadge, { color: C.textSecondary }]}>{badge}</Text>
        </View>
        <Text style={styles.budget}>{budgetText}</Text>
      </View>

      {!unlimited && <BudgetProgressBar spent={spentAmount} budget={allocatedBudget} />}

      <View style={styles.bottomRow}>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: C.textTertiary }]}>Spent</Text>
          <Text style={[styles.statValue, { color: C.text }]}>{spentText}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: C.textTertiary }]}>Remaining</Text>
          <Text style={[styles.statValue, { color: C.text }]}>{remainingText}</Text>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.sm },
  name: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base },
  roleBadge: {
    marginTop: 2,
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.xs,
    letterSpacing: 1.2 },
  budget: {
    fontFamily: Typography.fonts.accentBold,
    fontSize: Typography.sizes.lg,
    color: Colors.accent.primary },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md, marginTop: 2 },
  stat: { flex: 1 },
  statLabel: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.xs },
  statValue: {
    marginTop: 2,
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.sm } });

