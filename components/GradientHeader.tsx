import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing } from '../constants/theme';

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  style?: ViewStyle;
}

const GradientHeader: React.FC<GradientHeaderProps> = ({
  title,
  subtitle,
  style,
}) => {
  const shimmer = useSharedValue(0);

  React.useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2000 }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.7, 0.3]);
    return {
      opacity,
    };
  });

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={Colors.accent.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Animated.View style={shimmerStyle}>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  gradient: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Typography.fonts.accentBold,
    fontSize: Typography.sizes['3xl'],
    color: Colors.dark.text,
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontFamily: Typography.fonts.secondaryMedium,
    fontSize: Typography.sizes.base,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});

export default GradientHeader;
