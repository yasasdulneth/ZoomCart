import React from 'react';
import {
  Text,
  TextInput,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useResolvedTheme } from '../context/ThemeContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Typography, BorderRadius, Spacing, Colors } from '../constants/theme';

interface GlassInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string | null;
  icon?: React.ReactNode;
  containerStyle?: ViewStyle;
  rightElement?: React.ReactNode;
}

const GlassInput: React.FC<GlassInputProps> = ({
  label,
  error,
  icon,
  containerStyle,
  rightElement,
  ...textInputProps
}) => {
  const { isDark, colors: C } = useResolvedTheme();

  const focusAnim = useSharedValue(0);
  const shakeX = useSharedValue(0);

  const labelTop = useSharedValue(textInputProps.value || textInputProps.defaultValue ? -22 : 0);
  const labelSize = useSharedValue(textInputProps.value || textInputProps.defaultValue ? 11 : 15);

  const handleFocus = (e: any) => {
    focusAnim.value = withTiming(1, { duration: 200 });
    labelTop.value = withTiming(-22, { duration: 180 });
    labelSize.value = withTiming(11, { duration: 180 });
    textInputProps.onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    focusAnim.value = withTiming(0, { duration: 200 });
    if (!textInputProps.value) {
      labelTop.value = withTiming(0, { duration: 180 });
      labelSize.value = withTiming(15, { duration: 180 });
    }
    textInputProps.onBlur?.(e);
  };

  React.useEffect(() => {
    if (error) {
      shakeX.value = withSequence(
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(-6, { duration: 60 }),
        withTiming(6, { duration: 60 }),
        withTiming(0, { duration: 60 }),
      );
    }
  }, [error]);

  const containerAnim = useAnimatedStyle(() => ({
    borderColor: error
      ? Colors.accent.red
      : focusAnim.value > 0
        ? Colors.accent.primary
        : C.border,
    transform: [{ translateX: shakeX.value }] }));

  const labelAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: labelTop.value }],
    fontSize: labelSize.value,
    color: error
      ? Colors.accent.red
      : focusAnim.value > 0
        ? Colors.accent.primary
        : C.textSecondary }));

  return (
    <Animated.View style={[styles.wrapper, containerStyle]}>
      {label && (
        <Animated.Text
          style={[
            styles.floatingLabel,
            labelAnim,
            { fontFamily: Typography.fonts.primarySemiBold },
          ]}
        >
          {label}
        </Animated.Text>
      )}
      <Animated.View
        style={[
          styles.inputWrap,
          containerAnim,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            paddingLeft: icon ? 44 : Spacing.md },
        ]}
      >
        {icon && <Animated.View style={styles.iconWrap}>{icon}</Animated.View>}
        <TextInput
          {...textInputProps}
          style={[
            styles.input,
            {
              color: C.text,
              fontFamily: Typography.fonts.secondary },
          ]}
          placeholderTextColor={C.textTertiary}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {rightElement && <Animated.View style={styles.rightWrap}>{rightElement}</Animated.View>}
      </Animated.View>
      {!!error && (
        <Text style={[styles.errorText, { color: Colors.accent.red }]}>{error}</Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.md,
    position: 'relative' },
  floatingLabel: {
    position: 'absolute',
    top: 16,
    left: Spacing.md,
    zIndex: 2,
    letterSpacing: 0.2 },
  inputWrap: {
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingRight: Spacing.md },
  iconWrap: {
    position: 'absolute',
    left: 14,
    zIndex: 1 },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.sm,
    letterSpacing: -0.3 },
  rightWrap: {
    marginLeft: 8 },
  errorText: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4 } });

export default GlassInput;
