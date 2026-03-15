import React, { useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, BorderRadius } from '../../constants/theme';

const ACTION_WIDTH = 72;

type Props = {
  children: React.ReactNode;
  onDelete: () => void | Promise<void>;
};

export default function SessionSwipeRow({ children, onDelete }: Props) {
  const ref = useRef<Swipeable>(null);

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-ACTION_WIDTH - 24, -8, 0],
      outputRange: [1, 0.9, 0.75],
      extrapolate: 'clamp',
    });
    return (
      <View style={styles.actions}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash-outline" size={24} color="#FFFFFF" accessibilityLabel="Delete" />
        </Animated.View>
      </View>
    );
  };

  return (
    <Swipeable
      ref={ref}
      friction={2}
      rightThreshold={36}
      overshootRight={false}
      renderRightActions={renderRightActions}
      onSwipeableOpen={(direction) => {
        if (direction !== 'right') return;
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        void Promise.resolve(onDelete()).finally(() => {
          ref.current?.close();
        });
      }}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actions: {
    width: ACTION_WIDTH,
    flex: 1,
    backgroundColor: Colors.accent.red,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },
});
