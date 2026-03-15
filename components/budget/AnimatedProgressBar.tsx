import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Colors, BorderRadius } from '../../constants/theme';
import { useResolvedTheme } from '../../context/ThemeContext';

interface AnimatedProgressBarProps {
  progress: number; // 0..1
}

export default function AnimatedProgressBar({ progress }: AnimatedProgressBarProps) {
  const { isDark } = useResolvedTheme();
  const widthPct = useSharedValue(0);

  useEffect(() => {
    const clamped = Math.max(0, Math.min(1, progress));
    widthPct.value = withTiming(clamped, { duration: 420 });
  }, [progress, widthPct]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.round(widthPct.value * 100)}%`,
  }));

  const trackBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  return (
    <View style={[styles.track, { backgroundColor: trackBg }]}>
      <Animated.View style={[styles.fillWrap, fillStyle]}>
        <LinearGradient
          colors={Colors.accent.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 12,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  fillWrap: {
    height: '100%',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
  },
});
