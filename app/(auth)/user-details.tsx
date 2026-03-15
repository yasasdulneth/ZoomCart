import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import FloatingBackground from '../../components/FloatingBackground';
import GlassCard from '../../components/GlassCard';
import GradientButton from '../../components/GradientButton';
import AnimatedInput from '../../components/AnimatedInput';
import { onboardingStyles } from '../../styles/onboarding';
import { Colors, Spacing } from '../../constants/theme';

export default function UserDetailsScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const slideX = useSharedValue(50);
  const opacity = useSharedValue(0);

  const isValid = fullName.trim().length >= 2 && phone.trim().length >= 10;

  useEffect(() => {
    slideX.value = withSpring(0, { damping: 20 });
    opacity.value = withTiming(1, { duration: 400 });
  }, []);

  const animatedCard = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: slideX.value }],
  }));

  const validate = (): boolean => {
    const next: { name?: string; phone?: string } = {};
    if (fullName.trim().length < 2) {
      next.name = 'Please enter your full name';
    }
    if (phone.trim().length < 10) {
      next.phone = 'Please enter a valid phone number';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleContinue = () => {
    if (!validate()) return;
    router.replace('/success');
  };

  return (
    <View style={styles.container}>
      <FloatingBackground />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={animatedCard}>
            <GlassCard style={onboardingStyles.formCard}>
              <Text style={onboardingStyles.formTitle}>Tell Us About You</Text>
              <View style={onboardingStyles.inputGroup}>
                <AnimatedInput
                  label="Full Name"
                  placeholder="John Doe"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  error={errors.name}
                  containerStyle={styles.input}
                />
                <AnimatedInput
                  label="Phone Number"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  error={errors.phone}
                  containerStyle={styles.input}
                />
              </View>
              <GradientButton
                title="Continue"
                onPress={handleContinue}
                disabled={!isValid}
                size="large"
                style={styles.continueButton}
              />
            </GlassCard>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing['2xl'],
  },
  input: {
    marginBottom: Spacing.md,
  },
  continueButton: {
    width: '100%',
    marginTop: Spacing.sm,
  },
});
