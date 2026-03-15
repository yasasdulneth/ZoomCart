import React, { useMemo } from 'react';
import { View, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { useResolvedTheme } from '../../context/ThemeContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius, BlurIntensity } from '../../constants/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  loading?: boolean;
}

export default function SearchBar({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Search product (e.g. milk, bread)',
  loading = false }: SearchBarProps) {
  const { isDark, colors: C } = useResolvedTheme();
  const tint = isDark ? 'dark' : 'light';
  const grad = useMemo(
    () =>
      isDark ? ([Colors.glass.light, Colors.glass.dark] as const) : (['rgba(255,255,255,0.94)', 'rgba(245,245,250,0.9)'] as const),
    [isDark],
  );

  return (
    <View style={styles.wrapper}>
      <BlurView intensity={isDark ? BlurIntensity.light : BlurIntensity.medium} tint={tint} style={styles.blur}>
        <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.gradient, { borderColor: C.borderSubtle }]}>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { color: C.text }]}
              value={value}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor={C.textTertiary}
              onSubmitEditing={onSubmit}
              returnKeyType="search"
              editable={!loading}
            />
            {loading && (
              <ActivityIndicator size="small" color={Colors.accent.primary} style={styles.loader} />
            )}
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
    marginBottom: Spacing.lg },
  blur: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden' },
  gradient: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center' },
  input: {
    flex: 1,
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.base,
    paddingVertical: Spacing.md },
  loader: {
    marginLeft: Spacing.sm } });
