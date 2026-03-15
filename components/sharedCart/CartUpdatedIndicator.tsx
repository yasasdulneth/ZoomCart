import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

interface CartUpdatedIndicatorProps {
  visible: boolean;
}

export default function CartUpdatedIndicator({ visible }: CartUpdatedIndicatorProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSequence(
        withTiming(1.02, { duration: 150 }),
        withTiming(1, { duration: 150 })
      );
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.indicator, animatedStyle]}>
      <Text style={styles.text}>Cart updated</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  indicator: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.accent.primary + '25',
    borderWidth: 1,
    borderColor: Colors.accent.primary + '40',
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  text: {
    fontFamily: Typography.fonts.secondaryMedium,
    fontSize: Typography.sizes.xs,
    color: Colors.accent.primary,
    letterSpacing: 0.3,
  },
});
