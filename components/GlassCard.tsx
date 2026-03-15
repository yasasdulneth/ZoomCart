import React from 'react';
import { StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { DarkColors, LightColors, BorderRadius, Shadows } from '../constants/theme';
import { useResolvedTheme } from '../context/ThemeContext';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  radius?: number;
  noShadow?: boolean;
  floating?: boolean;
  padding?: number;
}

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity,
  radius = BorderRadius.lg,
  noShadow = false,
  floating = false,
  padding = 20,
}) => {
  const { isDark } = useResolvedTheme();
  const blurIntensity = intensity ?? (isDark ? 60 : 80);
  const tint = isDark ? 'dark' : 'light';
  const surfaceColor = isDark ? DarkColors.surface : LightColors.surface;
  const borderColor = isDark ? DarkColors.border : LightColors.borderSubtle;

  const translateY = useSharedValue(0);
  React.useEffect(() => {
    if (floating) {
      translateY.value = withRepeat(withTiming(-6, { duration: 2200 }), -1, true);
    }
  }, [floating, translateY]);
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const shadow = noShadow ? {} : (isDark ? Shadows.lg : Shadows.md);

  return (
    <Animated.View
      style={[
        {
          borderRadius: radius,
          overflow: 'hidden',
          ...shadow,
        },
        floating ? floatStyle : undefined,
        style,
      ]}
    >
      <BlurView intensity={blurIntensity} tint={tint} style={StyleSheet.absoluteFill} />
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: surfaceColor,
          borderRadius: radius,
          borderWidth: 1,
          borderColor,
          // inner glass rim highlight
          borderTopColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.8)',
          borderLeftColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.7)',
        }}
      />
      <Animated.View style={{ padding }}>
        {children}
      </Animated.View>
    </Animated.View>
  );
};

export default GlassCard;
