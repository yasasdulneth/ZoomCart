import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Pressable,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { Product } from '../../lib/api/products';
import { Colors, Typography, Spacing, BorderRadius, BlurIntensity } from '../../constants/theme';
import AnimatedButton from '../AnimatedButton';
import AlternativeSuggestionCard from '../product/AlternativeSuggestionCard';
import NutritionBadge from '../product/NutritionBadge';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.72;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ProductSheetState = 'product' | 'not_found' | 'error';

interface ProductBottomSheetProps {
  visible: boolean;
  state: ProductSheetState;
  product: Product | null;
  errorMessage?: string;
  onClose: () => void;
  onRetry?: () => void;
  onAddToCart?: (product: Product) => void;
}

export default function ProductBottomSheet({
  visible,
  state,
  product,
  errorMessage,
  onClose,
  onRetry,
  onAddToCart,
}: ProductBottomSheetProps) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const scale = useSharedValue(1);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 320 });
      translateY.value = withSpring(0, { damping: 22, stiffness: 220 });
      contentOpacity.value = withTiming(1, { duration: 400 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 250 });
      translateY.value = withSpring(SHEET_HEIGHT, { damping: 20, stiffness: 200 });
      contentOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97);
  };
  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const closeButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  if (!visible) return null;

  return (
    <>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.sheet, sheetStyle]}>
        <View style={styles.sheetInner}>
          <LinearGradient
            colors={[
              'rgba(255,255,255,0.18)',
              'rgba(255,255,255,0.06)',
              'rgba(255,255,255,0.02)',
            ]}
            locations={[0, 0.35, 1]}
            style={styles.topReflection}
          />
          <BlurView intensity={BlurIntensity.heavy + 10} tint="dark" style={styles.blur}>
            <LinearGradient
              colors={[
                'rgba(255,255,255,0.12)',
                'rgba(255,255,255,0.06)',
                'rgba(255,255,255,0.02)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradient}
            >
              <View style={styles.handleRow}>
                <View style={styles.handle} />
                <AnimatedPressable
                  onPress={onClose}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  style={[styles.closeButton, closeButtonStyle]}
                >
                  <Text style={styles.closeText}>✕</Text>
                </AnimatedPressable>
              </View>

              {state === 'product' && product && (
                <Animated.View style={[styles.content, contentAnimatedStyle]}>
                  <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.hero}>
                      <View style={styles.imageWrap}>
                        {product.imageUri ? (
                          <Image
                            source={{ uri: product.imageUri }}
                            style={styles.productImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.imagePlaceholder}>
                            <Text style={styles.placeholderEmoji}>📦</Text>
                          </View>
                        )}
                        <View style={styles.imageGlow} />
                        <View style={styles.imageReflection} />
                      </View>
                      <Text style={styles.productName} numberOfLines={2}>
                        {product.name}
                      </Text>
                      {product.brand ? (
                        <Text style={styles.brand} numberOfLines={1}>
                          {product.brand}
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.priceBlock}>
                      <Text style={styles.priceLabel}>Price</Text>
                      <View style={styles.priceRow}>
                        <Text style={styles.price}>
                          LKR {product.price.toFixed(2)}
                        </Text>
                        {product.unit ? (
                          <Text style={styles.priceUnit}>/ {product.unit}</Text>
                        ) : null}
                      </View>
                    </View>

                    {product.cheaperAlternative ? (
                      <AlternativeSuggestionCard
                        alternative={product.cheaperAlternative}
                        currentPrice={product.price}
                      />
                    ) : null}

                    {product.nutrition ? (
                      <View style={styles.nutritionSection}>
                        <Text style={styles.sectionLabel}>NUTRITION</Text>
                        <View style={styles.nutritionGrid}>
                          {product.nutrition.calories != null && (
                            <View style={styles.nutritionPill}>
                              <Text style={styles.nutritionValue}>{product.nutrition.calories}</Text>
                              <Text style={styles.nutritionLabel}>Cal</Text>
                            </View>
                          )}
                          {product.nutrition.sugar != null && (
                            <View style={styles.nutritionPill}>
                              <Text style={styles.nutritionValue}>{product.nutrition.sugar}</Text>
                              <Text style={styles.nutritionLabel}>Sugar</Text>
                            </View>
                          )}
                          {product.nutrition.fat != null && (
                            <View style={styles.nutritionPill}>
                              <Text style={styles.nutritionValue}>{product.nutrition.fat}</Text>
                              <Text style={styles.nutritionLabel}>Fat</Text>
                            </View>
                          )}
                          {product.nutrition.protein != null && (
                            <View style={styles.nutritionPill}>
                              <Text style={styles.nutritionValue}>{product.nutrition.protein}</Text>
                              <Text style={styles.nutritionLabel}>Protein</Text>
                            </View>
                          )}
                          {product.nutrition.carbs != null && (
                            <View style={styles.nutritionPill}>
                              <Text style={styles.nutritionValue}>{product.nutrition.carbs}</Text>
                              <Text style={styles.nutritionLabel}>Carbs</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.nutritionBadgeWrap}>
                          <NutritionBadge nutrition={product.nutrition} />
                        </View>
                        {product.nutrition.summary ? (
                          <Text style={styles.nutritionSummary}>{product.nutrition.summary}</Text>
                        ) : null}
                      </View>
                    ) : null}

                    <AnimatedButton
                      title="Add to Cart"
                      onPress={() => onAddToCart?.(product)}
                      size="large"
                      style={styles.addButton}
                    />
                    <AnimatedButton
                      title="Close"
                      onPress={onClose}
                      variant="outline"
                      size="medium"
                      style={styles.closeButtonBottom}
                    />
                  </ScrollView>
                </Animated.View>
              )}

              {state === 'not_found' && (
                <View style={styles.centeredState}>
                  <View style={styles.stateIconWrap}>
                    <Text style={styles.stateEmoji}>🔍</Text>
                  </View>
                  <Text style={styles.stateTitle}>Product not found</Text>
                  <Text style={styles.stateMessage}>
                    This barcode isn’t in our database. Try another product or scan again.
                  </Text>
                  <AnimatedButton title="Scan again" onPress={onClose} variant="outline" size="medium" />
                </View>
              )}

              {state === 'error' && (
                <View style={styles.centeredState}>
                  <View style={styles.stateIconWrap}>
                    <Text style={styles.stateEmoji}>⚠️</Text>
                  </View>
                  <Text style={styles.stateTitle}>Something went wrong</Text>
                  <Text style={styles.stateMessage}>
                    {errorMessage ?? 'Network error. Please try again.'}
                  </Text>
                  <AnimatedButton title="Retry" onPress={onRetry ?? onClose} variant="outline" size="medium" />
                </View>
              )}
            </LinearGradient>
          </BlurView>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
    zIndex: 15,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    overflow: 'hidden',
    zIndex: 16,
    shadowColor: Colors.accent.neon,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 16,
  },
  sheetInner: {
    flex: 1,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  topReflection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 2,
  },
  blur: {
    flex: 1,
    borderRadius: 0,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  handleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  handle: {
    position: 'absolute',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  closeText: {
    fontSize: Typography.sizes.lg,
    color: Colors.dark.text,
  },
  content: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  hero: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  imageWrap: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  productImage: {
    width: 112,
    height: 112,
    borderRadius: BorderRadius.lg,
  },
  imagePlaceholder: {
    width: 112,
    height: 112,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 44,
  },
  imageGlow: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    top: -9,
    left: -9,
    backgroundColor: Colors.accent.primary,
    opacity: 0.12,
  },
  imageReflection: {
    position: 'absolute',
    top: 0,
    left: 8,
    right: 8,
    height: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  productName: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: Typography.sizes['2xl'],
    color: Colors.dark.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  brand: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  priceBlock: {
    marginBottom: Spacing.lg,
  },
  priceLabel: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.xs,
    color: Colors.dark.textTertiary,
    letterSpacing: 1.2,
    marginBottom: Spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  price: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: Typography.sizes['3xl'],
    color: Colors.accent.primary,
    letterSpacing: -0.5,
  },
  priceUnit: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.base,
    color: Colors.dark.textSecondary,
    marginLeft: Spacing.xs,
  },
  nutritionSection: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.xs,
    color: Colors.dark.textTertiary,
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  nutritionBadgeWrap: {
    marginBottom: Spacing.sm,
  },
  nutritionPill: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    minWidth: 56,
    alignItems: 'center',
  },
  nutritionValue: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
    color: Colors.dark.text,
  },
  nutritionLabel: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.xs,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  nutritionSummary: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
  },
  addButton: {
    width: '100%',
  },
  closeButtonBottom: {
    width: '100%',
    marginTop: Spacing.sm,
  },
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  stateIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  stateEmoji: {
    fontSize: 40,
  },
  stateTitle: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: Typography.sizes.xl,
    color: Colors.dark.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  stateMessage: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.base,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
});
