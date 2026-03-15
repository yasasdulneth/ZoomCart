import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, BorderRadius } from '../constants/theme';
import { useResolvedTheme } from '../context/ThemeContext';

type ButtonVariant = 'fill' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface GlassButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const SIZE_CONFIG: Record<ButtonSize, { paddingV: number; paddingH: number; fontSize: number; height: number }> = {
  sm: { paddingV: 8,  paddingH: 16, fontSize: 14, height: 38 },
  md: { paddingV: 12, paddingH: 20, fontSize: 16, height: 48 },
  lg: { paddingV: 16, paddingH: 24, fontSize: 17, height: 56 },
};

const GlassButton: React.FC<GlassButtonProps> = ({
  title,
  onPress,
  variant = 'fill',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const { isDark } = useResolvedTheme();
  const sc = SIZE_CONFIG[size];
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };
  const handlePress = () => {
    if (disabled || loading) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const isDisabled = disabled || loading;

  const bgColor: Record<ButtonVariant, string> = {
    fill:    Colors.accent.primary,
    ghost:   isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    danger:  'rgba(255,59,48,0.15)',
    outline: 'transparent',
  };
  const borderColor: Record<ButtonVariant, string> = {
    fill:    'transparent',
    ghost:   isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)',
    danger:  'rgba(255,59,48,0.35)',
    outline: Colors.accent.primary,
  };
  const textColor: Record<ButtonVariant, string> = {
    fill:    '#FFFFFF',
    ghost:   isDark ? '#FFFFFF' : '#1C1C1E',
    danger:  '#FF3B30',
    outline: Colors.accent.primary,
  };

  return (
    <Animated.View
      style={[animStyle, style]}
      children={[
        <Pressable
          key="btn"
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isDisabled}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? title}
          accessibilityHint={accessibilityHint}
          accessibilityState={{ disabled: isDisabled, busy: loading }}
          style={[
            styles.btn,
            {
              paddingVertical: sc.paddingV,
              paddingHorizontal: sc.paddingH,
              minHeight: sc.height,
              backgroundColor: bgColor[variant],
              borderColor: borderColor[variant],
              opacity: isDisabled ? 0.48 : 1,
            },
          ]}
          children={
            loading ? (
              <ActivityIndicator size="small" color={variant === 'fill' ? '#FFFFFF' : Colors.accent.primary} />
            ) : (
              <View
                style={styles.contentRow}
                children={[
                  ...(icon != null
                    ? [<React.Fragment key="glass-btn-icon">{icon}</React.Fragment>]
                    : []),
                  <Text
                    key="lbl"
                    style={[
                      styles.label,
                      { fontSize: sc.fontSize, color: textColor[variant] },
                      textStyle,
                    ]}
                  >
                    {title}
                  </Text>,
                ]}
              />
            )
          }
        />,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  btn: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontFamily: Typography.fonts.primarySemiBold,
    letterSpacing: -0.3,
  },
});

export default GlassButton;
