import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius, BlurIntensity, DarkColors, LightColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');
const QR_SIZE = Math.min(280, Math.round(width * 0.66));

interface QRContainerProps {
  token: string | null;
  disabled?: boolean;
  footerText?: string;
}

export default function QRContainer({ token, disabled = false, footerText }: QRContainerProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const C = isDark ? DarkColors : LightColors;

  const scale = useSharedValue(1);

  useEffect(() => {
    if (token) {
      scale.value = 0.96;
      scale.value = withDelay(80, withSpring(1, { damping: 14, stiffness: 140 }));
    } else {
      scale.value = withTiming(1, { duration: 180 });
    }
  }, [token]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowColors = isDark
    ? (['rgba(0,245,255,0.35)', 'rgba(139,92,246,0.18)', 'rgba(236,72,153,0.12)'] as const)
    : (['rgba(0,122,255,0.20)', 'rgba(139,92,246,0.12)', 'rgba(236,72,153,0.08)'] as const);

  const cardInner = isDark
    ? ([Colors.glass.medium, Colors.glass.dark] as const)
    : (['rgba(255,255,255,0.92)', 'rgba(248,250,255,0.85)'] as const);

  const cardBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(60,60,67,0.14)';

  return (
    <Animated.View style={[styles.outer, animatedStyle]}>
      <LinearGradient colors={glowColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.glow}>
        <BlurView intensity={isDark ? BlurIntensity.heavy : BlurIntensity.medium} tint={isDark ? 'dark' : 'light'} style={styles.blur}>
          <LinearGradient colors={cardInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, { borderColor: cardBorder }]}>
            <View style={[styles.qrSurface, disabled && styles.qrSurfaceDisabled]}>
              {token ? (
                <QRCode
                  value={token}
                  size={QR_SIZE}
                  backgroundColor="#FFFFFF"
                  color="#0A0A0F"
                  quietZone={10}
                />
              ) : (
                <View style={styles.placeholder}>
                  <Text style={[styles.placeholderText, { color: C.textSecondary }]}>Generating QR…</Text>
                </View>
              )}
              {disabled && (
                <View style={styles.disabledOverlay}>
                  <Text style={[styles.disabledText, { color: Colors.accent.neon }]}>QR expired</Text>
                </View>
              )}
            </View>
            {!!footerText && <Text style={[styles.footer, { color: C.textSecondary }]}>{footerText}</Text>}
          </LinearGradient>
        </BlurView>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignSelf: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  glow: {
    padding: 2,
    borderRadius: BorderRadius.xl,
  },
  blur: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
  },
  qrSurface: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    overflow: 'hidden',
  },
  qrSurfaceDisabled: {
    opacity: 0.5,
  },
  placeholder: {
    width: QR_SIZE,
    height: QR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.base,
  },
  disabledOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,10,15,0.65)',
  },
  disabledText: {
    fontFamily: Typography.fonts.accentBold,
    fontSize: Typography.sizes.xl,
  },
  footer: {
    marginTop: Spacing.md,
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
  },
});
