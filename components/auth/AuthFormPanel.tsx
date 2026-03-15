import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useResolvedTheme } from '../../context/ThemeContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Shadows } from '../../constants/theme';

interface AuthFormPanelProps {
  children: React.ReactNode;
}

export function AuthFormPanel({ children }: AuthFormPanelProps) {
  const { isDark } = useResolvedTheme();

  return (
    <View
      style={[
        styles.shell,
        {
          borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.7)',
          backgroundColor: isDark ? 'rgba(28,28,30,0.45)' : 'rgba(255,255,255,0.55)',
          ...Shadows.lg,
          shadowColor: '#007AFF',
          shadowOpacity: 0.14,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 8 } },
      ]}
    >
      <BlurView intensity={isDark ? 65 : 80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(0,122,255,0.08)', 'rgba(0,122,255,0.00)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View
        pointerEvents="none"
        style={[styles.rim, { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.75)' }]}
      />
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden' },
  rim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 1 },
  inner: {
    padding: 20,
    zIndex: 2 } });
