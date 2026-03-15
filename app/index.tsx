import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboardingComplete } from '../hooks/useOnboardingComplete';

export default function IndexScreen() {
  const router = useRouter();
  const { isComplete, isLoading } = useOnboardingComplete();

  useEffect(() => {
    if (isLoading) return;
    if (isComplete) {
      router.replace('/dashboard');
    } else {
      router.replace('/welcome');
    }
  }, [isComplete, isLoading, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6366F1" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
