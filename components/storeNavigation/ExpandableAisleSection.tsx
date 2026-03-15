import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useResolvedTheme } from '../../context/ThemeContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate } from 'react-native-reanimated';
import type { AisleProduct } from '../../lib/api/store';
import { Colors, Typography, Spacing } from '../../constants/theme';

interface ExpandableAisleSectionProps {
  products: AisleProduct[];
  expanded: boolean;
  highlightedProductName: string | null;
}

function ProductRow({
  product,
  highlighted }: {
  product: AisleProduct;
  highlighted: boolean;
}) {
  const { isDark, colors: C } = useResolvedTheme();
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = withSpring(highlighted ? 1 : 0);
  }, [highlighted]);

  const animatedStyle = useAnimatedStyle(() => {
    const borderOpacity = interpolate(glow.value, [0, 1], [0, 0.85]);
    const shadowOpacity = interpolate(glow.value, [0, 1], [0, 0.35]);
    return {
      borderColor: `rgba(0, 122, 255, ${borderOpacity})`,
      borderWidth: highlighted ? 1 : 0,
      shadowColor: Colors.accent.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity,
      shadowRadius: 12,
      elevation: 4 };
  });

  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';

  return (
    <Animated.View style={[styles.productCard, { backgroundColor: cardBg }, animatedStyle]}>
      <Text style={[styles.productName, { color: C.text }]}>{product.name}</Text>
      <Text style={[styles.shelfLocation, { color: C.textSecondary }]}>{product.shelfLocation}</Text>
    </Animated.View>
  );
}

export default function ExpandableAisleSection({
  products,
  expanded,
  highlightedProductName }: ExpandableAisleSectionProps) {
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (expanded) {
      height.value = withSpring(1, { damping: 20, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      height.value = withTiming(0, { duration: 200 });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [expanded]);

  const animatedContainer = useAnimatedStyle(() => ({
    opacity: opacity.value,
    maxHeight: interpolate(height.value, [0, 1], [0, 800]),
    overflow: 'hidden' as const }));

  return (
    <Animated.View style={[styles.container, animatedContainer]}>
      <View style={styles.list}>
        {products.map((p) => (
          <ProductRow
            key={p.id}
            product={p}
            highlighted={
              highlightedProductName != null &&
              p.name.toLowerCase() === highlightedProductName.toLowerCase()
            }
          />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm },
  list: {
    gap: Spacing.sm },
  productCard: {
    borderRadius: 12,
    padding: Spacing.md },
  productName: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
    marginBottom: Spacing.xs },
  shelfLocation: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm } });
