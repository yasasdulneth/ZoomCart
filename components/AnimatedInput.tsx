import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius, BlurIntensity } from '../constants/theme';

interface AnimatedInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export default function AnimatedInput({
  label,
  error,
  containerStyle,
  onFocus,
  onBlur,
  ...rest
}: AnimatedInputProps) {
  const focused = useSharedValue(0);

  const borderAnimatedStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      focused.value,
      [0, 1],
      [Colors.glass.medium, Colors.accent.primary]
    );
    return {
      borderWidth: 1.5,
      borderColor,
    };
  });

  const handleFocus = (e: any) => {
    focused.value = withTiming(1, { duration: 200 });
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    focused.value = withTiming(0, { duration: 200 });
    onBlur?.(e);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label != null ? (
        <Text style={styles.label}>{label}</Text>
      ) : null}
      <Animated.View style={[styles.inputWrap, borderAnimatedStyle]}>
        <BlurView intensity={BlurIntensity.light} tint="dark" style={styles.blur}>
          <LinearGradient
            colors={[Colors.glass.light, Colors.glass.dark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <TextInput
              style={styles.input}
              placeholderTextColor={Colors.dark.textTertiary}
              onFocus={handleFocus}
              onBlur={handleBlur}
              {...rest}
            />
          </LinearGradient>
        </BlurView>
      </Animated.View>
      {error != null ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  label: {
    fontFamily: Typography.fonts.primaryMedium,
    fontSize: Typography.sizes.sm,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.xs,
  },
  inputWrap: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  blur: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  gradient: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 52,
    justifyContent: 'center',
  },
  input: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.base,
    color: Colors.dark.text,
    padding: 0,
  },
  error: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.xs,
    color: Colors.accent.tertiary,
    marginTop: Spacing.xs,
  },
});
