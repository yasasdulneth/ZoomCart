import React, { useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import GlassBadge from '../GlassBadge';
import GlassButton from '../GlassButton';
import QuantitySelector from './QuantitySelector';
import { Colors, Typography, Spacing, BorderRadius, Shadows, DarkColors, LightColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import type { Product } from '../../lib/api/products';
import { formatLkr } from '../../lib/utils/currency';
import { useTranslation } from 'react-i18next';

function getUnitPrice(p: Product) {
  if (p.hasDiscount && typeof p.discountedPrice === 'number') return p.discountedPrice;
  if (typeof p.originalPrice === 'number') return p.originalPrice;
  return p.price;
}

interface ProductDetailsModalProps {
  visible: boolean;
  loading: boolean;
  /** Structured scan/load failure (preferred over raw English strings). */
  errorCode?: 'not_found' | 'network' | null;
  /** Extra detail for network errors (API message). */
  errorDetail?: string | null;
  product: Product | null;
  quantity: number;
  onChangeQuantity: (q: number) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ProductDetailsModal({
  visible,
  loading,
  errorCode,
  errorDetail,
  product,
  quantity,
  onChangeQuantity,
  onClose,
  onConfirm,
}: ProductDetailsModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const C = isDark ? DarkColors : LightColors;

  useEffect(() => {
    if (visible && errorCode === 'not_found') Vibration.vibrate(100);
  }, [visible, errorCode]);

  const stock = product?.stockQuantity ?? null;
  const outOfStock = typeof stock === 'number' && stock <= 0;
  const maxQty = typeof stock === 'number' ? Math.max(0, stock) : undefined;
  const unitPrice = useMemo(() => (product ? getUnitPrice(product) : 0), [product]);
  const subtotal = useMemo(() => unitPrice * quantity, [unitPrice, quantity]);
  const warning =
    typeof stock === 'number' && quantity > stock
      ? t('productModal.only_in_stock', { stock })
      : null;
  const canAdd =
    !!product &&
    !loading &&
    !errorCode &&
    !outOfStock &&
    (typeof stock !== 'number' || quantity <= stock) &&
    quantity >= 1;

  const discountPct =
    product?.hasDiscount && product.originalPrice && product.discountedPrice
      ? Math.round(((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100)
      : 0;

  const stockVariant =
    typeof stock !== 'number' ? 'default'
    : stock === 0 ? 'danger'
    : stock <= 5 ? 'warning'
    : 'success';

  const stockLabel =
    typeof stock !== 'number'
      ? t('productModal.stock_unknown')
      : stock === 0
        ? t('productModal.out_stock')
        : stock <= 5
          ? t('productModal.low_stock', { stock })
          : t('productModal.in_stock', { stock });

  const nutritionPills = useMemo(() => {
    if (!product?.nutrition) return [];
    const n = product.nutrition;
    return [
      n.calories ? `🔥 ${n.calories} kcal` : null,
      n.protein  ? `💪 ${n.protein} protein` : null,
      n.carbs    ? `🌾 ${n.carbs} carbs` : null,
      n.fat      ? `🫙 ${n.fat} fat` : null,
      n.sugar    ? `🍬 ${n.sugar} sugar` : null,
    ].filter(Boolean) as string[];
  }, [product?.nutrition]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <BlurView intensity={isDark ? 40 : 28} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      </Pressable>

      {/* Sheet */}
      <Animated.View
        entering={FadeInDown.springify().damping(18).stiffness(200)}
        style={[
          styles.sheet,
          {
            paddingBottom: Math.max(insets.bottom, Spacing.md),
            backgroundColor: isDark ? 'rgba(16,18,24,0.97)' : 'rgba(255,255,255,0.97)',
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(60,60,67,0.14)',
            ...Shadows.lg,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.16)' }]} />

        <LinearGradient
          colors={
            isDark
              ? ['rgba(0,122,255,0.22)', 'rgba(175,82,222,0.08)', 'transparent']
              : ['rgba(0,122,255,0.12)', 'rgba(175,82,222,0.06)', 'transparent']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sheetHeroTint}
          pointerEvents="none"
        />
        <View style={styles.sheetHeader}>
          <View style={styles.sheetHeaderText}>
            <Text style={[styles.sheetKicker, { color: C.textSecondary }]}>{t('productModal.sheet_kicker')}</Text>
            <Text style={[styles.sheetTitle, { color: C.text }]}>{t('productModal.sheet_title')}</Text>
          </View>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeBtn,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            accessibilityLabel={t('productModal.close_a11y')}
            accessibilityRole="button"
            hitSlop={12}
          >
            <Ionicons name="close" size={22} color={C.textSecondary} />
          </Pressable>
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.accent.primary} />
            <Text style={[styles.mutedText, { color: C.textSecondary }]}>{t('productModal.fetching')}</Text>
          </View>
        )}

        {/* Error */}
        {!loading && !!errorCode && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.center}>
            <Text style={styles.errorEmoji}>{errorCode === 'not_found' ? '🔍' : '⚠️'}</Text>
            <Text style={[styles.errorTitle, { color: C.text }]}>
              {errorCode === 'not_found'
                ? t('productModal.err_heading_not_found')
                : t('productModal.err_heading_load')}
            </Text>
            <View style={styles.errorBadge}>
              <Text style={styles.errorBadgeText}>
                {errorCode === 'not_found'
                  ? t('productModal.err_not_found_key')
                  : errorDetail ?? t('scanContent.network_error')}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Product content */}
        {!loading && !errorCode && product && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.body}
          >
            {/* Product image + name */}
            <View style={styles.productHero}>
              {!!product.imageUri && (
                <View style={[styles.imageWrap, { borderColor: C.border }]}>
                  <Image source={{ uri: product.imageUri }} style={styles.image} resizeMode="cover" />
                </View>
              )}
              <View style={styles.heroInfo}>
                <Text style={[styles.productName, { color: C.text }]} numberOfLines={2}>
                  {product.name}
                </Text>
                <View style={styles.badgeRow}>
                  {!!product.category && (
                    <GlassBadge label={product.category} variant="info" size="sm" />
                  )}
                  <GlassBadge label={stockLabel} variant={stockVariant} size="sm" />
                  {discountPct > 0 && (
                    <GlassBadge label={`-${discountPct}%`} variant="danger" size="sm" />
                  )}
                </View>
              </View>
            </View>

            {/* Price section */}
            <View style={[styles.sectionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: C.borderSubtle }]}>
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: C.textSecondary }]}>{t('productModal.unit_price')}</Text>
                <Text style={[styles.priceValue, { color: Colors.accent.green }]}>{formatLkr(unitPrice)}</Text>
              </View>
              {product.hasDiscount && typeof product.originalPrice === 'number' && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: C.textSecondary }]}>{t('productModal.original')}</Text>
                  <Text style={[styles.priceStrike, { color: C.textTertiary }]}>{formatLkr(product.originalPrice)}</Text>
                </View>
              )}
              <View
                style={[
                  styles.priceRow,
                  styles.subtotalRow,
                  { borderTopColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)' },
                ]}
              >
                <Text style={[styles.priceLabel, { color: C.text, fontFamily: Typography.fonts.primarySemiBold }]}>
                  {t('productModal.subtotal')}
                </Text>
                <Text style={[styles.subtotalValue, { color: C.text }]}>{formatLkr(subtotal)}</Text>
              </View>
            </View>

            {/* Nutrition pills */}
            {(nutritionPills.length > 0 || !!product.nutrition?.summary) && (
              <View style={styles.sectionWrap}>
                <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>{t('productModal.nutrition_heading')}</Text>
                {nutritionPills.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
                    {nutritionPills.map((pill) => (
                      <GlassBadge key={pill} label={pill} variant="default" size="sm" style={styles.nutritionPill} />
                    ))}
                  </ScrollView>
                )}
                {!!product.nutrition?.summary && (
                  <Text style={[styles.nutritionSummary, { color: C.textSecondary }]}>
                    {product.nutrition.summary}
                  </Text>
                )}
              </View>
            )}

            {/* Cheaper alternative */}
            {!!product.cheaperAlternative && (
              <View style={[styles.altCard, { backgroundColor: isDark ? 'rgba(52,199,89,0.08)' : 'rgba(52,199,89,0.06)', borderColor: 'rgba(52,199,89,0.22)' }]}>
                <Text style={styles.altTitle}>{t('productModal.cheaper_alt_title')}</Text>
                <Text style={[styles.altName, { color: C.text }]}>{product.cheaperAlternative.name}</Text>
                <Text style={[styles.altPrice, { color: Colors.accent.green }]}>{formatLkr(product.cheaperAlternative.price)}</Text>
              </View>
            )}

            {/* Quantity selector */}
            <View style={[styles.sectionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: C.borderSubtle }]}>
              <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>{t('productModal.quantity_heading')}</Text>
              <QuantitySelector value={quantity} min={1} max={maxQty} onChange={onChangeQuantity} />
              {!!warning && (
                <Text style={[styles.warnText, { color: Colors.accent.orange }]}>{warning}</Text>
              )}
            </View>
          </ScrollView>
        )}

        {/* Footer buttons */}
        <View style={[styles.footer, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
          <GlassButton
            title={t('common.cancel')}
            onPress={onClose}
            variant="ghost"
            size="md"
            style={styles.footerBtn}
            accessibilityLabel={t('common.cancel')}
          />
          <GlassButton
            title={
              outOfStock
                ? t('productModal.add_out')
                : canAdd
                  ? t('productModal.add_with_price', { price: formatLkr(subtotal) })
                  : t('productModal.add_to_cart')
            }
            onPress={() => {
              if (canAdd) {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onConfirm();
              }
            }}
            variant="fill"
            size="md"
            disabled={!canAdd}
            style={[styles.footerBtn, { flex: 2 }]}
            accessibilityLabel={outOfStock ? t('productModal.a11y_out') : t('productModal.a11y_add')}
          />
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '88%',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  sheetHeroTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    zIndex: 1,
  },
  sheetHeaderText: {
    flex: 1,
    gap: 2,
    paddingRight: Spacing.sm,
  },
  sheetKicker: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sheetTitle: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: 22,
    letterSpacing: 0.35,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  mutedText: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 14,
    marginTop: Spacing.sm,
  },
  errorEmoji: { fontSize: 44 },
  errorTitle: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: 18,
    textAlign: 'center',
  },
  errorBadge: {
    backgroundColor: 'rgba(255,59,48,0.12)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.25)',
  },
  errorBadgeText: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 13,
    color: '#FF3B30',
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  productHero: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  imageWrap: {
    width: 88,
    height: 88,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
  },
  image: { width: '100%', height: '100%' },
  heroInfo: { flex: 1, gap: 8 },
  productName: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: 20,
    letterSpacing: 0.38,
    lineHeight: 26,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sectionCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtotalRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  priceLabel: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 14,
    letterSpacing: -0.08,
  },
  priceValue: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: 16,
    letterSpacing: -0.3,
  },
  priceStrike: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  subtotalValue: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: 20,
    letterSpacing: 0.38,
  },
  sectionWrap: { gap: 8 },
  sectionTitle: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  pillsScroll: { flexGrow: 0 },
  nutritionPill: { marginRight: 6 },
  nutritionSummary: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.08,
  },
  altCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: 4,
  },
  altTitle: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: 12,
    color: Colors.accent.green,
    letterSpacing: 0.3,
  },
  altName: {
    fontFamily: Typography.fonts.primaryMedium,
    fontSize: 15,
    letterSpacing: -0.24,
  },
  altPrice: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: 16,
  },
  warnText: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 12,
    letterSpacing: -0.08,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  footerBtn: { flex: 1 },
});
