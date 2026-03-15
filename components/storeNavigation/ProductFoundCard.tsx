import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useResolvedTheme } from '../../context/ThemeContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withTiming } from 'react-native-reanimated';
import type { ProductLocationResponse } from '../../lib/api/store';
import { Colors, Typography, Spacing, BorderRadius, BlurIntensity } from '../../constants/theme';

interface ProductFoundCardProps {
  location: ProductLocationResponse | null;
  visible: boolean;
}

export default function ProductFoundCard({ location, visible }: ProductFoundCardProps) {
  const { isDark, colors: C } = useResolvedTheme();
  const tint = isDark ? 'dark' : 'light';
  const grad = useMemo(
    () =>
      isDark ? ([Colors.glass.light, Colors.glass.dark] as const) : (['rgba(255,255,255,0.94)', 'rgba(245,245,250,0.9)'] as const),
    [isDark],
  );

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    if (visible && location) {
      opacity.value = withDelay(80, withTiming(1, { duration: 300 }));
      scale.value = withDelay(80, withTiming(1, { duration: 300 }));
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.95, { duration: 200 });
    }
  }, [visible, location]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }] }));

  if (!visible || !location) return null;

  return (
    <Animated.View style={[styles.wrapper, { borderColor: isDark ? 'rgba(0,122,255,0.35)' : 'rgba(0,122,255,0.28)' }, animatedStyle]}>
      <BlurView intensity={BlurIntensity.medium} tint={tint} style={styles.blur}>
        <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.gradient, { borderColor: C.borderSubtle }]}>
          <Text style={[styles.label, { color: Colors.accent.primary }]}>Product found</Text>
          <Text style={[styles.productName, { color: C.text }]}>{location.product}</Text>
          <Text style={[styles.aisleSection, { color: C.textSecondary }]}>
            {location.aisle} · {location.section}
          </Text>
        </LinearGradient>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1 },
  blur: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden' },
  gradient: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1 },
  label: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.xs,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1 },
  productName: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
    marginBottom: Spacing.xs },
  aisleSection: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm } });
