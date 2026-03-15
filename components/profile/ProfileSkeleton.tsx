import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import GlassCard from '../GlassCard';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

export default function ProfileSkeleton() {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1200 }), -1, false);
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.7, 0.3]),
  }));

  return (
    <View style={styles.container}>
      <View style={styles.avatarSkeleton} />
      <GlassCard style={styles.card} padding={Spacing.lg}>
        <Animated.View style={[styles.line, styles.lineWide, shimmerStyle]} />
        <Animated.View style={[styles.line, shimmerStyle]} />
        <Animated.View style={[styles.line, styles.lineMedium, shimmerStyle]} />
      </GlassCard>
      <GlassCard style={styles.card} padding={Spacing.lg}>
        <Animated.View style={[styles.line, styles.lineMedium, shimmerStyle]} />
        <Animated.View style={[styles.line, styles.lineWide, shimmerStyle]} />
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  avatarSkeleton: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: Colors.glass.medium,
    alignSelf: 'center',
  },
  card: {
    width: '100%',
  },
  line: {
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.glass.medium,
    marginVertical: Spacing.xs,
  },
  lineWide: {
    width: '80%',
  },
  lineMedium: {
    width: '50%',
  },
});
