/**
 * Shared premium auth backdrop — matches HomeScreen ambient orbs + gradient + noise.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';

interface OrbProps {
  size: number;
  color: string;
  top: number;
  left?: number;
  right?: number;
  driftX: [number, number];
  driftY: [number, number];
  duration: number;
}

function FloatingOrb({ size, color, top, left, right, driftX, driftY, duration }: OrbProps) {
  const tx = useSharedValue(driftX[0]);
  const ty = useSharedValue(driftY[0]);

  useEffect(() => {
    tx.value = withRepeat(
      withSequence(
        withTiming(driftX[1], { duration, easing: Easing.inOut(Easing.ease) }),
        withTiming(driftX[0], { duration, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    ty.value = withRepeat(
      withSequence(
        withTiming(driftY[1], { duration: duration * 1.1, easing: Easing.inOut(Easing.ease) }),
        withTiming(driftY[0], { duration: duration * 1.1, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          top,
          left,
          right,
        },
        style,
      ]}
    />
  );
}

interface AuthAmbientBackgroundProps {
  isDark: boolean;
}

export function AuthAmbientBackground({ isDark }: AuthAmbientBackgroundProps) {
  const bgColors: [string, string, string] = isDark
    ? ['#0A0A0F', '#0D1117', '#0A0E1A']
    : ['#EEF2FF', '#F5F0FF', '#EFF6FF'];

  const orbBlue = isDark ? 'rgba(0,122,255,0.18)' : 'rgba(0,122,255,0.10)';
  const orbPurple = isDark ? 'rgba(175,82,222,0.14)' : 'rgba(175,82,222,0.08)';
  const orbTeal = isDark ? 'rgba(50,215,175,0.10)' : 'rgba(50,215,175,0.07)';

  return (
    <Animated.View entering={FadeIn.duration(400)} style={StyleSheet.absoluteFill}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
      <FloatingOrb size={280} color={orbBlue} top={-40} left={-70} driftX={[-12, 12]} driftY={[-8, 8]} duration={7000} />
      <FloatingOrb size={240} color={orbPurple} top={160} right={-90} driftX={[8, -8]} driftY={[10, -10]} duration={9000} />
      <FloatingOrb size={180} color={orbTeal} top={380} left={20} driftX={[-6, 6]} driftY={[-12, 6]} duration={11000} />
      <View pointerEvents="none" style={[styles.noise, { opacity: isDark ? 0.03 : 0.025 }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
  },
  noise: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
});
