import React, { useEffect, useMemo } from 'react';
import {
  Modal,
  StyleSheet,
  Pressable,
  Dimensions,
  type ViewStyle,
} from 'react-native';
import { useResolvedTheme } from '../context/ThemeContext';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BorderRadius, Shadows } from '../constants/theme';

const { height: SCREEN_H } = Dimensions.get('window');
const DISMISS_THRESHOLD = 80;

interface AnimatedGlassModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: number | string;
  style?: ViewStyle;
  dismissOnBackdrop?: boolean;
}

function resolveSheetMaxHeight(value: number | string | undefined, screenH: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const pct = /^(\d+(?:\.\d+)?)%$/.exec(value.trim());
    if (pct) return Math.round((parseFloat(pct[1]) / 100) * screenH);
    const n = parseFloat(value);
    if (Number.isFinite(n)) return Math.round(n);
  }
  return Math.round(screenH * 0.9);
}

const AnimatedGlassModal: React.FC<AnimatedGlassModalProps> = ({
  visible,
  onClose,
  children,
  maxHeight = '90%',
  style,
  dismissOnBackdrop = true }) => {
  const { isDark, colors: C } = useResolvedTheme();
  const sheetMaxHeightPx = useMemo(
    () => resolveSheetMaxHeight(maxHeight, SCREEN_H),
    [maxHeight],
  );

  const translateY = useSharedValue(SCREEN_H);
  const backdropOpacity = useSharedValue(0);
  const dragY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 260 });
      translateY.value = withSpring(0, { damping: 18, stiffness: 200, mass: 0.9 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 220 });
      translateY.value = withTiming(SCREEN_H, { duration: 260 });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + dragY.value }] }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value }));

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) dragY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_THRESHOLD) {
        dragY.value = withTiming(SCREEN_H, { duration: 260 }, () => {
          runOnJS(onClose)();
        });
        backdropOpacity.value = withTiming(0, { duration: 220 });
      } else {
        dragY.value = withSpring(0, { damping: 18, stiffness: 200 });
      }
    });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={styles.root}>
        {/* Backdrop */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissOnBackdrop ? onClose : undefined}
        >
          <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
            <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </Pressable>

        {/* Sheet */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.sheet,
              {
                maxHeight: sheetMaxHeightPx,
                backgroundColor: C.surfaceElevated ?? C.surface,
                borderColor: C.border,
                ...Shadows.lg },
              sheetStyle,
              style,
            ]}
          >
            {/* Drag handle */}
            <Animated.View
              style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)' }]}
            />
            {children}
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end' },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
    paddingTop: 8 },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 8 } });

export default AnimatedGlassModal;
