import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import FloatingBackground from '../../components/FloatingBackground';
import GlassCard from '../../components/GlassCard';
import { useOnboardingComplete } from '../../hooks/useOnboardingComplete';
import { onboardingStyles } from '../../styles/onboarding';
import { Colors } from '../../constants/theme';

export default function SuccessScreen() {
  const router = useRouter();
  const { setComplete } = useOnboardingComplete();
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);
  const checkOpacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(100, withSpring(1, { damping: 14 }));
    opacity.value = withDelay(150, withTiming(1, { duration: 500 }));
    checkOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
  }, []);

  useEffect(() => {
    setComplete();
    const t = setTimeout(() => {
      router.replace('/dashboard');
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <FloatingBackground />
      <View style={onboardingStyles.floatingContainer}>
        <Animated.View style={cardStyle}>
          <GlassCard style={onboardingStyles.successCard}>
            <Animated.View style={checkStyle}>
              <LinearGradient
                colors={[Colors.accent.primary, Colors.accent.secondary]}
                style={onboardingStyles.successIconContainer}
              >
                <Text style={onboardingStyles.successIcon}>✓</Text>
              </LinearGradient>
            </Animated.View>
            <Text style={onboardingStyles.successTitle}>All Set!</Text>
            <Text style={onboardingStyles.successSubtitle}>Let's Shop</Text>
          </GlassCard>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
});
