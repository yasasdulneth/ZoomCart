import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withDelay,
  withSequence,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius, BlurIntensity } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export default function LoadingOverlay({ visible, message = 'Looking up product...' }: LoadingOverlayProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withTiming(1, { duration: 350 });
      shimmer.value = withRepeat(
        withTiming(1, { duration: 1500 }),
        -1,
        false
      );
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.95, { duration: 200 });
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + shimmer.value * 0.4,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, containerStyle]}>
      <BlurView intensity={BlurIntensity.heavy} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.card}>
        <LinearGradient
          colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.04)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.cardTopReflection} />
          <ActivityIndicator size="large" color={Colors.accent.neon} />
          <Text style={styles.message}>{message}</Text>
          <View style={styles.skeletonRow}>
            <Animated.View style={[styles.skeletonBox, styles.skeletonImage, shimmerStyle]} />
            <View style={styles.skeletonTextCol}>
              <Animated.View style={[styles.skeletonBox, styles.skeletonLine, shimmerStyle]} />
              <Animated.View style={[styles.skeletonBox, styles.skeletonLineShort, shimmerStyle]} />
            </View>
          </View>
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  card: {
    width: SCREEN_WIDTH - Spacing.lg * 2,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: Colors.accent.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  cardGradient: {
    padding: Spacing.xl,
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
  },
  cardTopReflection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  message: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.base,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.md,
  },
  skeletonRow: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    gap: Spacing.md,
    width: '100%',
  },
  skeletonBox: {
    backgroundColor: Colors.glass.medium,
    borderRadius: BorderRadius.sm,
  },
  skeletonImage: {
    width: 80,
    height: 80,
  },
  skeletonTextCol: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  skeletonLine: {
    height: 16,
    width: '90%',
  },
  skeletonLineShort: {
    height: 14,
    width: '60%',
  },
});
