import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useResolvedTheme } from '../../context/ThemeContext';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  runOnJS,
  FadeInDown,
  FadeOutUp,
} from 'react-native-reanimated';
import { Typography, Spacing, BorderRadius, Colors } from '../../constants/theme';
import type { PersonalCartItem } from '../../context/PersonalCartContext';
import GlassCard from '../GlassCard';
import { formatLkr } from '../../lib/utils/currency';

const SWIPE_THRESHOLD = -80;

interface CartItemCardProps {
  item: PersonalCartItem;
  index?: number;
  onRemove: (id: string) => void;
  onChangeQuantity: (id: string, qty: number) => void;
  /** Hide swipe-to-remove and quantity steppers (history receipt view). */
  readOnly?: boolean;
}

export default function CartItemCard({
  item,
  index = 0,
  onRemove,
  onChangeQuantity,
  readOnly = false,
}: CartItemCardProps) {
  const { isDark, colors: C } = useResolvedTheme();

  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const qtyScale = useSharedValue(1);

  const emojiBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const qtyBorder = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)';

  useEffect(() => {
    qtyScale.value = withSequence(withTiming(1.06, { duration: 90 }), withTiming(1, { duration: 120 }));
  }, [item.quantity]);

  const pan = Gesture.Pan()
    .enabled(!readOnly)
    .onUpdate((e) => {
      if (e.translationX < 0) translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX < SWIPE_THRESHOLD) {
        translateX.value = withTiming(-200);
        opacity.value = withTiming(0);
        scale.value = withTiming(0.9);
        runOnJS(onRemove)(item.id);
      } else {
        translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const qtyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: qtyScale.value }],
  }));

  const handleChange = (delta: number) => {
    const next = item.quantity + delta;
    if (next <= 0) {
      onRemove(item.id);
    } else {
      onChangeQuantity(item.id, next);
    }
  };

  const innerCard = (
    <GlassCard style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.emojiWrap, { backgroundColor: emojiBg }]}>
          <Text style={styles.emoji}>{item.emoji ?? '🛒'}</Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: C.text }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.price, { color: C.textSecondary }]}>{formatLkr(item.price)}</Text>
        </View>
        {readOnly ? (
          <Text style={[styles.qtyReadOnly, { color: C.textSecondary }]}>
            ×{item.quantity}
          </Text>
        ) : (
          <Animated.View style={qtyStyle}>
            <View style={styles.qtyRow}>
              <TouchableOpacity
                onPress={() => handleChange(-1)}
                activeOpacity={0.8}
                style={[styles.qtyBtn, { borderColor: qtyBorder }]}
                accessibilityRole="button"
                accessibilityLabel="Decrease quantity"
              >
                <Text style={[styles.qtyBtnText, { color: C.text }]}>−</Text>
              </TouchableOpacity>
              <Text style={[styles.qtyText, { color: C.text }]}>{item.quantity}</Text>
              <TouchableOpacity
                onPress={() => handleChange(1)}
                activeOpacity={0.8}
                style={[styles.qtyBtn, { borderColor: qtyBorder }]}
                accessibilityRole="button"
                accessibilityLabel="Increase quantity"
              >
                <Text style={[styles.qtyBtnText, { color: C.text }]}>+</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </View>
    </GlassCard>
  );

  const outer = (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 40, 200)).duration(280)}
      exiting={FadeOutUp.duration(200)}
      style={styles.container}
    >
      {readOnly ? innerCard : <Animated.View style={rowStyle}>{innerCard}</Animated.View>}
    </Animated.View>
  );

  return readOnly ? outer : <GestureDetector gesture={pan}>{outer}</GestureDetector>;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  card: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiWrap: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  emoji: {
    fontSize: 28,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
    marginBottom: 2,
  },
  price: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
  },
  qtyText: {
    width: 36,
    textAlign: 'center' as const,
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
    marginHorizontal: Spacing.xs,
  },
  qtyReadOnly: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.sm,
    marginLeft: Spacing.sm,
  },
});
