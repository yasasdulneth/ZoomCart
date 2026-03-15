import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useResolvedTheme } from '../../context/ThemeContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius, BlurIntensity } from '../../constants/theme';
import AnimatedProgressBar from './AnimatedProgressBar';
import { formatLkr } from '../../lib/utils/currency';

interface BudgetSummaryCardProps {
  budget: number;
  currentSpent: number;
  remaining: number;
  progress: number;
  isActive: boolean;
}

export default function BudgetSummaryCard({
  budget,
  currentSpent,
  remaining,
  progress,
  isActive }: BudgetSummaryCardProps) {
  const { isDark, colors: C } = useResolvedTheme();
  const tint = isDark ? 'dark' : 'light';
  const grad = useMemo(
    () =>
      isDark ? ([Colors.glass.light, Colors.glass.dark] as const) : (['rgba(255,255,255,0.94)', 'rgba(245,245,250,0.9)'] as const),
    [isDark],
  );

  if (!isActive) return null;

  return (
    <View style={[styles.wrapper, { borderColor: C.borderSubtle }]}>
      <BlurView intensity={BlurIntensity.medium} tint={tint} style={styles.blur}>
        <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
          <View style={styles.row}>
            <View style={styles.metric}>
              <Text style={[styles.label, { color: C.textTertiary }]}>Budget</Text>
              <Text style={[styles.value, { color: C.text }]}>{formatLkr(budget)}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={[styles.label, { color: C.textTertiary }]}>Spent</Text>
              <Text style={[styles.value, { color: C.text }]}>{formatLkr(currentSpent)}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={[styles.label, { color: C.textTertiary }]}>Remaining</Text>
              <Text style={[styles.value, { color: C.text }, remaining <= 0 && styles.valueDanger]}>
                {formatLkr(remaining)}
              </Text>
            </View>
          </View>
          <View style={styles.progressWrap}>
            <AnimatedProgressBar progress={progress} />
          </View>
        </LinearGradient>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    marginTop: Spacing.md },
  blur: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden' },
  gradient: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md },
  metric: {
    flex: 1,
    marginRight: Spacing.sm },
  label: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.xs,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.7 },
  value: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.sm },
  valueDanger: {
    color: Colors.accent.red },
  progressWrap: {
    marginTop: Spacing.sm } });
