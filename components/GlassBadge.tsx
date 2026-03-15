import React from 'react';
import { Text, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated from 'react-native-reanimated';
import { DarkColors, LightColors, Typography, BorderRadius } from '../constants/theme';
import { useResolvedTheme } from '../context/ThemeContext';

type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const VARIANT_COLORS: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  default:  { bg: 'rgba(255,255,255,0.12)', text: '#AEAEB2', border: 'rgba(255,255,255,0.15)' },
  accent:   { bg: 'rgba(0,122,255,0.18)',   text: '#007AFF', border: 'rgba(0,122,255,0.30)' },
  success:  { bg: 'rgba(52,199,89,0.18)',   text: '#34C759', border: 'rgba(52,199,89,0.30)' },
  warning:  { bg: 'rgba(255,159,10,0.18)',  text: '#FF9F0A', border: 'rgba(255,159,10,0.30)' },
  danger:   { bg: 'rgba(255,59,48,0.18)',   text: '#FF3B30', border: 'rgba(255,59,48,0.30)' },
  info:     { bg: 'rgba(88,86,214,0.18)',   text: '#5856D6', border: 'rgba(88,86,214,0.30)' },
};

interface GlassBadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'sm' | 'md';
}

const GlassBadge: React.FC<GlassBadgeProps> = ({
  label,
  variant = 'default',
  style,
  textStyle,
  size = 'md',
}) => {
  const { isDark } = useResolvedTheme();
  const vc = VARIANT_COLORS[variant];

  const isSmall = size === 'sm';

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          paddingHorizontal: isSmall ? 8 : 12,
          paddingVertical: isSmall ? 3 : 5,
          backgroundColor: vc.bg,
          borderColor: vc.border,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            fontSize: isSmall ? 11 : 13,
            color: vc.text,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  label: {
    fontFamily: Typography.fonts.primarySemiBold,
    letterSpacing: 0.2,
  },
});

export default GlassBadge;
