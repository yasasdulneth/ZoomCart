import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius, BlurIntensity } from '../../constants/theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function NavigationHeader() {
  const navigation = useNavigation();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withDelay(50, withTiming(1, { duration: 400 }));
    translateY.value = withDelay(50, withTiming(0, { duration: 400 }));
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.96);
  };
  const handlePressOut = () => {
    scale.value = withTiming(1);
  };
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.wrapper, containerStyle]}>
      <BlurView intensity={BlurIntensity.medium} tint="dark" style={styles.blur}>
        <LinearGradient
          colors={[Colors.glass.light, Colors.glass.dark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <AnimatedTouchable
            onPress={() => navigation.goBack()}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[styles.backButton, backStyle]}
            activeOpacity={1}
          >
            <Text style={styles.backText}>← Back</Text>
          </AnimatedTouchable>
          <Text style={styles.title}>Store Navigation</Text>
          <Text style={styles.subtitle}>Find products by aisle</Text>
        </LinearGradient>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    shadowColor: Colors.accent.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  blur: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  backText: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
    color: Colors.accent.primary,
  },
  title: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: Typography.sizes['2xl'],
    color: Colors.dark.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    color: Colors.dark.textSecondary,
  },
});
