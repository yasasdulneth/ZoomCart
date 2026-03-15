import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, DarkColors, LightColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CountdownTimerProps {
  expiresAt: number | null;
  now: number;
  size?: number;
  strokeWidth?: number;
}

function formatMmSs(ms: number) {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function CountdownTimer({
  expiresAt,
  now,
  size = 74,
  strokeWidth = 8,
}: CountdownTimerProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const C = isDark ? DarkColors : LightColors;

  const radius = useMemo(() => (size - strokeWidth) / 2, [size, strokeWidth]);
  const circumference = useMemo(() => 2 * Math.PI * radius, [radius]);
  const progress = useSharedValue(1);

  const remainingMs = expiresAt ? expiresAt - now : 0;
  const durationMs = useMemo(() => 2 * 60 * 1000, []);

  const trackColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(60,60,67,0.18)';

  useEffect(() => {
    if (!expiresAt) return;
    const remaining = Math.max(0, expiresAt - Date.now());
    const startProgress = Math.min(1, remaining / durationMs);
    progress.value = startProgress;
    progress.value = withTiming(0, {
      duration: remaining,
      easing: Easing.linear,
    });
  }, [expiresAt, durationMs]);

  const animatedProps = useAnimatedProps(() => {
    const dashOffset = circumference * (1 - progress.value);
    return {
      strokeDashoffset: dashOffset,
    };
  });

  return (
    <View style={styles.wrapper}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.accent.primary}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={styles.textOverlay}>
        <Text style={[styles.timeText, { color: C.text }]}>{formatMmSs(remainingMs)}</Text>
        <Text style={[styles.caption, { color: C.textTertiary }]}>expires</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 74,
    height: 74,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    alignSelf: 'center',
  },
  textOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
  },
  caption: {
    marginTop: 2,
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
