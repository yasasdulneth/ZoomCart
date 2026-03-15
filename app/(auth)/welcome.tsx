import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import FloatingBackground from '../../components/FloatingBackground';
import GlassCard from '../../components/GlassCard';
import GradientButton from '../../components/GradientButton';
import { onboardingStyles } from '../../styles/onboarding';
import { Colors, Typography, Spacing } from '../../constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(24);

  useEffect(() => {
    titleOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));
    subtitleOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    cardOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));
    cardTranslateY.value = withDelay(500, withSpring(0, { damping: 18 }));
  }, []);

  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));
  const subtitleStyle = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  const handleGoogle = () => {
    router.push('/user-details');
  };

  const handlePhone = () => {
    router.push('/user-details');
  };

  return (
    <View style={styles.container}>
      <FloatingBackground />
      <View style={onboardingStyles.floatingContainer}>
        <Animated.View style={cardStyle}>
          <GlassCard floating style={onboardingStyles.welcomeCard}>
            <LinearGradient
              colors={[Colors.accent.primary + '30', Colors.accent.secondary + '20']}
              style={onboardingStyles.logoContainer}
            >
              <Text style={onboardingStyles.logoText}>ZC</Text>
            </LinearGradient>
            <Animated.Text style={[onboardingStyles.welcomeTitle, titleStyle]}>
              Welcome to ZOOMCART
            </Animated.Text>
            <Animated.Text style={[onboardingStyles.welcomeSubtitle, subtitleStyle]}>
              The Smart Way to Shop
            </Animated.Text>
            <View style={onboardingStyles.buttonGroup}>
              <GradientButton
                title="Continue with Google"
                onPress={handleGoogle}
                size="large"
                style={styles.button}
              />
              <GradientButton
                title="Continue with Phone Number"
                onPress={handlePhone}
                variant="outline"
                size="large"
                style={styles.button}
              />
            </View>
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
  button: {
    width: '100%',
  },
});
