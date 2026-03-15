import React, { useMemo } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useResolvedTheme } from '../../context/ThemeContext';
import GlassCard from '../GlassCard';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

function sanitizeMoneyInput(raw: string) {
  // Keep digits only (no decimals for Rs input)
  const digits = raw.replace(/[^\d]/g, '');
  return digits.replace(/^0+(?=\d)/, '');
}

export default function BudgetAllocationInput({
  name,
  phoneNumber,
  value,
  onChange,
  error }: {
  name: string;
  phoneNumber: string;
  value: string;
  onChange: (next: string) => void;
  error?: string | null;
}) {
  const { isDark, colors: C } = useResolvedTheme();
  const displayPhone = useMemo(() => (phoneNumber ? phoneNumber : '—'), [phoneNumber]);
  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';

  return (
    <GlassCard style={styles.card} padding={Spacing.md}>
      <View style={styles.topRow}>
        <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.phone, { color: C.textSecondary }]} numberOfLines={1}>
          {displayPhone}
        </Text>
      </View>

      <View style={styles.bottomRow}>
        <Text style={[styles.inputLabel, { color: C.textTertiary }]}>Allocate Budget (Rs)</Text>
        <TextInput
          value={value}
          onChangeText={(t) => onChange(sanitizeMoneyInput(t))}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={C.textTertiary}
          style={[
            styles.input,
            { color: C.text, backgroundColor: inputBg, borderColor: C.borderSubtle },
            !!error && styles.inputError,
          ]}
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {},
  topRow: { gap: 2, marginBottom: Spacing.sm },
  name: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base },
  phone: {
    marginTop: 2,
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm },
  bottomRow: { gap: 6 },
  inputLabel: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.xs },
  input: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    textAlign: 'right' },
  inputError: {
    borderColor: 'rgba(255,0,102,0.35)' },
  error: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.xs,
    color: Colors.accent.tertiary } });

