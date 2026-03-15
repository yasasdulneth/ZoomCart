import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useResolvedTheme } from '../../context/ThemeContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate } from 'react-native-reanimated';
import { Typography, Spacing, BorderRadius, Colors } from '../../constants/theme';
import { formatLkr } from '../../lib/utils/currency';
import GlassCard from '../GlassCard';

interface CartSummaryCardProps {
  subtotal: number;
  total: number;
  /** Smaller typography and padding — e.g. shared session guest footer */
  compact?: boolean;
}

export default function CartSummaryCard({ subtotal, total, compact = false }: CartSummaryCardProps) {
  const { isDark, colors: C } = useResolvedTheme();

  const animatedTotal = useSharedValue(total);

  useEffect(() => {
    animatedTotal.value = withTiming(total, { duration: 220 });
  }, [total]);

  const totalStyle = useAnimatedStyle(() => ({
    opacity: interpolate(animatedTotal.value, [total - 50, total + 50], [0.85, 1]) }));

  const dividerColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';

  return (
    <GlassCard
      padding={compact ? Spacing.md : 20}
      style={[styles.wrapper, compact && styles.wrapperCompact]}
    >
      <View style={[styles.row, compact && styles.rowCompact]}>
        <Text style={[styles.label, compact && styles.labelCompact, { color: C.textSecondary }]}>
          Subtotal
        </Text>
        <Text style={[styles.value, compact && styles.valueCompact, { color: C.text }]}>
          {formatLkr(subtotal)}
        </Text>
      </View>
      <View
        style={[
          styles.divider,
          compact && styles.dividerCompact,
          { backgroundColor: dividerColor },
        ]}
      />
      <View style={[styles.row, compact && styles.rowLastCompact]}>
        <Text style={[styles.labelStrong, compact && styles.labelStrongCompact, { color: C.text }]}>
          Total
        </Text>
        <Animated.Text
          style={[
            styles.totalText,
            compact && styles.totalTextCompact,
            { color: Colors.accent.primary },
            totalStyle,
          ]}
        >
          {formatLkr(total)}
        </Animated.Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md },
  wrapperCompact: {
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm },
  rowCompact: { marginBottom: Spacing.xs },
  rowLastCompact: { marginBottom: 0 },
  label: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm },
  labelCompact: {
    fontSize: Typography.sizes.xs },
  labelStrong: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base },
  labelStrongCompact: {
    fontSize: Typography.sizes.sm },
  value: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base },
  valueCompact: {
    fontSize: Typography.sizes.sm },
  totalText: {
    fontFamily: Typography.fonts.accentBold,
    fontSize: Typography.sizes['2xl'] },
  totalTextCompact: {
    fontSize: Typography.sizes.lg },
  divider: {
    height: 1,
    marginVertical: Spacing.sm },
  dividerCompact: {
    marginVertical: Spacing.xs } });
