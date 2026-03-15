import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useResolvedTheme } from '../../context/ThemeContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withTiming } from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius, BlurIntensity } from '../../constants/theme';

interface GuidanceStepsCardProps {
  steps: string[];
  visible: boolean;
}

export default function GuidanceStepsCard({ steps, visible }: GuidanceStepsCardProps) {
  const { isDark, colors: C } = useResolvedTheme();
  const tint = isDark ? 'dark' : 'light';
  const grad = useMemo(
    () =>
      isDark ? ([Colors.glass.light, Colors.glass.dark] as const) : (['rgba(255,255,255,0.94)', 'rgba(245,245,250,0.9)'] as const),
    [isDark],
  );

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    if (visible && steps.length > 0) {
      opacity.value = withDelay(100, withTiming(1, { duration: 300 }));
      translateY.value = withDelay(100, withTiming(0, { duration: 300 }));
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(8, { duration: 200 });
    }
  }, [visible, steps.length]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }] }));

  if (!visible || steps.length === 0) return null;

  return (
    <Animated.View style={[styles.wrapper, { borderColor: C.borderSubtle }, animatedStyle]}>
      <BlurView intensity={BlurIntensity.medium} tint={tint} style={styles.blur}>
        <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.gradient, { borderColor: C.borderSubtle }]}>
          <Text style={[styles.title, { color: C.text }]}>How to find it</Text>
          <View style={styles.steps}>
            {steps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={[styles.bullet, { backgroundColor: isDark ? 'rgba(0,122,255,0.22)' : 'rgba(0,122,255,0.12)' }]}>
                  <Text style={[styles.bulletText, { color: Colors.accent.primary }]}>{i + 1}</Text>
                </View>
                <Text style={[styles.stepText, { color: C.textSecondary }]}>{step}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1 },
  blur: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden' },
  gradient: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1 },
  title: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: Typography.sizes.lg,
    marginBottom: Spacing.md },
  steps: {
    gap: Spacing.sm },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center' },
  bullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md },
  bulletText: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.sm },
  stepText: {
    flex: 1,
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.base } });
