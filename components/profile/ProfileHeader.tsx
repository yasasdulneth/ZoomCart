import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useResolvedTheme } from '../../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import {
  Colors,
  Typography,
  Spacing,
  BlurIntensity } from '../../constants/theme';

const HEADER_HEIGHT = 56;
const BORDER_RADIUS_BOTTOM = 22;

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function ProfileHeader() {
  const navigation = useNavigation();
  const { isDark, colors: C } = useResolvedTheme();

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-8);
  const backScale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withDelay(40, withTiming(1, { duration: 340 }));
    translateY.value = withDelay(40, withTiming(0, { duration: 340 }));
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }] }));

  const backButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: backScale.value }] }));

  const blurTint = isDark ? 'dark' : 'light';
  const gradientOpaque = isDark ? 'rgba(28,28,30,0.82)' : 'rgba(255,255,255,0.88)';
  const gradientSoft = isDark ? 'rgba(44,44,46,0.72)' : 'rgba(255,255,255,0.72)';
  const borderCol = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0,0,0,0.08)';

  return (
    <Animated.View style={[styles.outer, headerStyle]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
      <BlurView intensity={BlurIntensity.medium} tint={blurTint} style={[styles.blur, { borderColor: borderCol }]}>
        <LinearGradient
          colors={[gradientSoft, gradientOpaque]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.row}>
            <AnimatedTouchable
              style={[styles.backWrap, backButtonStyle]}
              onPress={() => navigation.goBack()}
              onPressIn={() => {
                backScale.value = withTiming(0.94, { duration: 90 });
              }}
              onPressOut={() => {
                backScale.value = withTiming(1, { duration: 110 });
              }}
              activeOpacity={1}
            >
              <Text style={[styles.backLabel, { color: Colors.accent.primary }]}>← Back</Text>
            </AnimatedTouchable>
            <Text style={[styles.title, { color: C.text }]}>My Profile</Text>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>
      </BlurView>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginBottom: Spacing.lg },
  blur: {
    borderBottomLeftRadius: BORDER_RADIUS_BOTTOM,
    borderBottomRightRadius: BORDER_RADIUS_BOTTOM,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: Colors.accent.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 10 },
      android: { elevation: 8 } }) },
  gradient: {
    minHeight: HEADER_HEIGHT,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between' },
  backWrap: {
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.sm,
    minWidth: 72 },
  backLabel: {
    fontFamily: Typography.fonts.primaryMedium,
    fontSize: Typography.sizes.base },
  title: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: Typography.sizes.xl,
    letterSpacing: 0.35 },
  placeholder: {
    width: 72 } });
