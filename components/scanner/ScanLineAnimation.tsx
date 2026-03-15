import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DEFAULT_SCAN_AREA_HEIGHT = 220;
const LINE_DURATION = 2400;

interface ScanLineAnimationProps {
  visible?: boolean;
  /** When provided (e.g. in a modal), the line is positioned and animates within this frame */
  frameTop?: number;
  frameHeight?: number;
}

export default function ScanLineAnimation({
  visible = true,
  frameTop: propsFrameTop,
  frameHeight: propsFrameHeight,
}: ScanLineAnimationProps) {
  const scanAreaHeight = propsFrameHeight ?? DEFAULT_SCAN_AREA_HEIGHT;
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const trailingOpacity = useSharedValue(0.5);
  const glowPulse = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      opacity.value = withTiming(0, { duration: 200 });
      return;
    }
    opacity.value = withTiming(1, { duration: 300 });
    translateY.value = 0;
    trailingOpacity.value = 0.5;
    translateY.value = withRepeat(
      withTiming(scanAreaHeight - 2, {
        duration: LINE_DURATION,
        easing: Easing.bezier(0.33, 0, 0.2, 1),
      }),
      -1,
      true
    );
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0, { duration: 800 })
      ),
      -1,
      true
    );
  }, [visible, scanAreaHeight]);

  const leadingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const trailingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value - 12 }],
    opacity: opacity.value * trailingOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value * (0.15 + glowPulse.value * 0.2),
  }));

  if (!visible) return null;

  const frameTop =
    propsFrameTop ?? (SCREEN_HEIGHT - DEFAULT_SCAN_AREA_HEIGHT) / 2 - 80;

  return (
    <View
      style={[
        styles.wrapper,
        { top: frameTop, height: scanAreaHeight },
      ]}
      pointerEvents="none"
    >
      <Animated.View style={[styles.glowBeam, glowStyle]} />
      <Animated.View style={[styles.trailingLine, trailingStyle]}>
        <LinearGradient
          colors={[
            'transparent',
            Colors.accent.neon + '25',
            Colors.accent.neon + '55',
            'transparent',
          ]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.trailingGradient}
        />
      </Animated.View>
      <Animated.View style={[styles.leadingLine, leadingStyle]}>
        <View style={styles.lineCore} />
        <LinearGradient
          colors={[
            'transparent',
            Colors.accent.neon + '60',
            Colors.accent.neon,
            Colors.accent.neon + '60',
            'transparent',
          ]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.leadingGradient}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
  },
  glowBeam: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    height: 36,
    marginTop: -18,
    borderRadius: 18,
    backgroundColor: Colors.accent.neon,
    shadowColor: Colors.accent.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 8,
  },
  trailingLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 24,
    marginTop: -12,
  },
  trailingGradient: {
    flex: 1,
    height: 24,
    borderRadius: 2,
  },
  leadingLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    marginTop: -1,
  },
  lineCore: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.accent.neon,
    borderRadius: 1,
  },
  leadingGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -6,
    height: 14,
    borderRadius: 2,
  },
});
