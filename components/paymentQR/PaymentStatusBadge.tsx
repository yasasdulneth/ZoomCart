import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import type { PaymentStatus } from '../../lib/api/payments';
import { Colors, Typography, Spacing, BorderRadius, DarkColors, LightColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
}

function badgeConfig(status: PaymentStatus, isDark: boolean) {
  const subtle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(60,60,67,0.08)';
  switch (status) {
    case 'VERIFIED':
      return {
        label: 'Payment verified',
        emoji: '🟢',
        colors: ['rgba(0,245,255,0.22)', 'rgba(99,102,241,0.18)'] as [string, string],
        text: Colors.accent.neon,
      };
    case 'EXPIRED':
      return {
        label: 'Expired',
        emoji: '🔴',
        colors: ['rgba(236,72,153,0.18)', subtle] as [string, string],
        text: '#FF4D7D',
      };
    default:
      return {
        label: 'Waiting for verification',
        emoji: '🟡',
        colors: ['rgba(139,92,246,0.18)', subtle] as [string, string],
        text: isDark ? '#FFD36A' : '#B8860B',
      };
  }
}

export default function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.98);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 220 });
    scale.value = withTiming(1, { duration: 220 });
    return () => {
      opacity.value = 0;
      scale.value = 0.98;
    };
  }, [status]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const cfg = badgeConfig(status, isDark);
  const borderColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(60,60,67,0.14)';

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <LinearGradient
        colors={cfg.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.badge, { borderColor }]}
      >
        <Text style={styles.emoji}>{cfg.emoji}</Text>
        <Text style={[styles.label, { color: cfg.text }]}>{cfg.label}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'center',
    marginTop: Spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  emoji: {
    marginRight: Spacing.sm,
    fontSize: 14,
  },
  label: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.sm,
  },
});
