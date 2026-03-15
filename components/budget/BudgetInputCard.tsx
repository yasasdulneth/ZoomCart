import React, { useMemo } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useResolvedTheme } from '../../context/ThemeContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius, BlurIntensity } from '../../constants/theme';

interface BudgetInputCardProps {
  value: string;
  onChangeText: (text: string) => void;
  formattedPreview: string;
  error?: string | null;
}

export default function BudgetInputCard({
  value,
  onChangeText,
  formattedPreview,
  error }: BudgetInputCardProps) {
  const { isDark, colors: C } = useResolvedTheme();
  const tint = isDark ? 'dark' : 'light';
  const grad = useMemo(
    () =>
      isDark ? ([Colors.glass.light, Colors.glass.dark] as const) : (['rgba(255,255,255,0.94)', 'rgba(245,245,250,0.9)'] as const),
    [isDark],
  );

  return (
    <View style={[styles.wrapper, { borderColor: C.borderSubtle }]}>
      <BlurView intensity={BlurIntensity.medium} tint={tint} style={styles.blur}>
        <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
          <Text style={[styles.label, { color: C.textSecondary }]}>Set your budget</Text>
          <View style={styles.inputRow}>
            <Text style={[styles.currency, { color: Colors.accent.primary }]}>LKR</Text>
            <TextInput
              style={[styles.input, { color: C.text }]}
              value={value}
              onChangeText={onChangeText}
              placeholder="0"
              placeholderTextColor={C.textTertiary}
              keyboardType="numeric"
              returnKeyType="done"
            />
          </View>
          <Text style={[styles.preview, { color: C.textSecondary }]}>{formattedPreview}</Text>
          {!!error && <Text style={styles.error}>{error}</Text>}
        </LinearGradient>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1 },
  blur: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden' },
  gradient: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl },
  label: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    marginBottom: Spacing.md },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm },
  currency: {
    fontFamily: Typography.fonts.accentBold,
    fontSize: Typography.sizes['2xl'],
    marginRight: Spacing.sm },
  input: {
    flex: 1,
    fontFamily: Typography.fonts.accentBold,
    fontSize: Typography.sizes['4xl'],
    paddingVertical: Spacing.sm },
  preview: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.base },
  error: {
    marginTop: Spacing.sm,
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    color: Colors.accent.red } });
