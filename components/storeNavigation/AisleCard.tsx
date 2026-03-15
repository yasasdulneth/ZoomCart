import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useResolvedTheme } from '../../context/ThemeContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import type { Aisle } from '../../lib/api/store';
import { Colors, Typography, Spacing, BorderRadius, BlurIntensity } from '../../constants/theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface AisleCardProps {
  aisle: Aisle;
  expanded: boolean;
  highlighted: boolean;
  onPress: () => void;
  children?: React.ReactNode;
}

export default function AisleCard({
  aisle,
  expanded,
  highlighted,
  onPress,
  children }: AisleCardProps) {
  const { isDark, colors: C } = useResolvedTheme();
  const tint = isDark ? 'dark' : 'light';
  const grad = isDark
    ? ([Colors.glass.light, Colors.glass.dark] as const)
    : (['rgba(255,255,255,0.94)', 'rgba(245,245,250,0.9)'] as const);

  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(highlighted ? 1 : 0);

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };
  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }] }));

  const borderStyle = useAnimatedStyle(() => ({
    borderWidth: 1,
    borderColor: `rgba(0, 122, 255, ${borderOpacity.value * 0.55})` }));

  useEffect(() => {
    borderOpacity.value = withTiming(highlighted ? 1 : 0, { duration: 300 });
  }, [highlighted]);

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.wrapper, animatedCardStyle]}
      activeOpacity={1}
    >
      <Animated.View style={[styles.borderWrap, borderStyle]}>
        <BlurView intensity={BlurIntensity.light} tint={tint} style={styles.blur}>
          <LinearGradient
            colors={grad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradient, { borderColor: C.borderSubtle }]}
          >
            <View style={styles.row}>
              <View style={styles.main}>
                <Text style={[styles.aisleNumber, { color: Colors.accent.primary }]}>{aisle.number}</Text>
                <Text style={[styles.category, { color: C.text }]}>{aisle.category}</Text>
                <Text style={[styles.count, { color: C.textSecondary }]}>{aisle.productCount} products</Text>
              </View>
              <Text style={[styles.chevron, { color: C.textTertiary }]}>{expanded ? '▼' : '▶'}</Text>
            </View>
            {children}
          </LinearGradient>
        </BlurView>
      </Animated.View>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden' },
  borderWrap: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden' },
  blur: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden' },
  gradient: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between' },
  main: {
    flex: 1 },
  aisleNumber: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: Typography.sizes.xl,
    marginBottom: Spacing.xs },
  category: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
    marginBottom: Spacing.xs },
  count: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm },
  chevron: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm } });
