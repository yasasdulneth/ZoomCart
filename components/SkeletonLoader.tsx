import React, { useEffect } from 'react';
import { View, StyleSheet, type ViewStyle, type DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { BorderRadius } from '../constants/theme';
import { useResolvedTheme } from '../context/ThemeContext';

interface SkeletonLineProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export const SkeletonLine: React.FC<SkeletonLineProps> = ({
  width = '100%',
  height = 16,
  radius = BorderRadius.sm,
  style,
}) => {
  const { isDark } = useResolvedTheme();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1200 }), -1, false);
  }, []);

  const shimmerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(shimmer.value, [0, 0.5, 1], [0.4, 0.9, 0.4], Extrapolation.CLAMP);
    return { opacity };
  });

  const baseColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const highlightColor = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.10)';

  return (
    <View style={[{ width, height, borderRadius: radius, overflow: 'hidden' }, style]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { borderRadius: radius, backgroundColor: baseColor },
          shimmerStyle,
        ]}
      />
    </View>
  );
};

interface SkeletonCardProps {
  lines?: number;
  style?: ViewStyle;
  showAvatar?: boolean;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  lines = 3,
  style,
  showAvatar = false,
}) => {
  const { isDark } = useResolvedTheme();
  const bgColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: bgColor, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
        style,
      ]}
    >
      <View style={styles.cardInner}>
        {showAvatar && (
          <SkeletonLine width={48} height={48} radius={9999} style={styles.avatarSkeleton} />
        )}
        <View style={styles.linesWrap}>
          {Array.from({ length: lines }).map((_, i) => (
            <SkeletonLine
              key={i}
              width={i === lines - 1 ? '60%' : '100%'}
              height={i === 0 ? 20 : 14}
              style={{ marginBottom: i < lines - 1 ? 8 : 0 }}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatarSkeleton: {
    flexShrink: 0,
  },
  linesWrap: {
    flex: 1,
  },
});

export default SkeletonLine;
