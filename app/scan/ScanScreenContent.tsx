/**
 * Scan screen content - no expo-router dependency.
 * Import this from ProductScanScreen (React Navigation) to avoid loading expo-router.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { fetchProductByBarcode } from '../../lib/api/products';
import { PRODUCT_BARCODE_TYPES, SCAN_CLOSE_ZOOM } from '../../constants/productScanner';
import type { Product } from '../../lib/api/products';
import type { ProductSheetState } from '../../components/scanner/ProductBottomSheet';
import ScannerOverlay from '../../components/scanner/ScannerOverlay';
import LoadingOverlay from '../../components/scanner/LoadingOverlay';
import AddToCartToast from '../../components/scanner/AddToCartToast';
import { useCartOptional } from '../../context/CartContext';
import { usePersonalCartOptional } from '../../context/PersonalCartContext';
import { useBudgetOptional } from '../../context/BudgetContext';
import { useAuthOptional } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  addItemToSharedSession,
  getSharedSession,
} from '../../lib/services/sharedSession.service';
import { playAddToCartChime } from '../../lib/sounds/uiChimes';
import { getSocket } from '../../lib/services/socket.service';
import { Colors, Typography, Spacing, DarkColors, LightColors } from '../../constants/theme';
import AnimatedProgressBar from '../../components/budget/AnimatedProgressBar';
import { formatLkr } from '../../lib/utils/currency';
import ProductDetailsModal from '../../components/scanProduct/ProductDetailsModal';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SCAN_COOLDOWN_MS = 2500;
const TOAST_DURATION_MS = 2200;

function normalizeBarcode(value: unknown) {
  const raw = String(value ?? '');
  const trimmed = raw.trim();
  const noSpaces = trimmed.replace(/\s+/g, '');
  const digitsOnly = noSpaces.replace(/[^\d]/g, '');
  return { raw, trimmed, noSpaces, digitsOnly };
}

export interface ScanScreenContentProps {
  onBack: () => void;
  closeAfterAdd?: boolean;
  /** When set, scanned items are added to this shared session instead of the personal cart. */
  sharedSessionId?: string;
}

export function ScanScreenContent({ onBack, closeAfterAdd, sharedSessionId }: ScanScreenContentProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { resolvedTheme } = useTheme();
  const isThemeDark = resolvedTheme === 'dark';
  const C = isThemeDark ? DarkColors : LightColors;

  const cart = useCartOptional();
  const personalCart = usePersonalCartOptional();
  const budget = useBudgetOptional();
  const auth = useAuthOptional();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [sheetState, setSheetState] = useState<ProductSheetState>('product');
  const [product, setProduct] = useState<Product | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [toastVisible, setToastVisible] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [closeUpZoom, setCloseUpZoom] = useState(false);
  const lastBarcodeRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessingScanRef = useRef(false);

  const cameraOpacity = useSharedValue(0);
  const budgetShake = useSharedValue(0);
  const budgetSuccessOpacity = useSharedValue(0);

  useEffect(() => {
    cameraOpacity.value = withDelay(300, withTiming(1, { duration: 600 }));
  }, []);

  const cameraAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cameraOpacity.value,
  }));

  const budgetShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: budgetShake.value }],
  }));

  const budgetSuccessStyle = useAnimatedStyle(() => ({
    opacity: budgetSuccessOpacity.value,
  }));

  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (detailsVisible) return;
      if (isProcessingScanRef.current) return;
      if (!scanning || loading) return;

      // 1) Log full scanner event object
      const event: any = result as any;
      try {
        // eslint-disable-next-line no-console
        console.log('SCAN EVENT:', JSON.stringify(event, null, 2));
      } catch {
        // ignore stringify failures (circular refs etc)
      }

      // 2) Extract barcode safely from all possible fields
      const scannedValue =
        event?.data || event?.rawValue || event?.value || event?.nativeEvent?.data;

      // 3) Normalize barcode
      const n = normalizeBarcode(scannedValue);
      const type = String(event?.type ?? '');

      // Ignore URL payloads (this is what produced "192168148082" from exp://192.168.1.4:8082).
      // But allow numeric/plain QR codes.
      const isUrl = n.trimmed.startsWith('exp://') || n.trimmed.startsWith('http://') || n.trimmed.startsWith('https://') || n.trimmed.includes('://');
      if (isUrl) {
        // eslint-disable-next-line no-console
        console.log('[scan] Ignored URL-like scan:', { type, value: n.trimmed });
        return;
      }

      // Prefer numeric barcodes for lookup.
      const digits = n.digitsOnly;
      const barcode = digits || n.trimmed;
      const barcodeForCooldown = digits || n.noSpaces || n.trimmed;

      // 4) Log normalized barcode and length
      // eslint-disable-next-line no-console
      console.log('Normalized barcode:', barcode);
      // eslint-disable-next-line no-console
      console.log('Barcode length:', barcode.length);
      // eslint-disable-next-line no-console
      console.log('[scan] Barcode candidates:', {
        trimmed: n.trimmed,
        noSpaces: n.noSpaces,
        digitsOnly: n.digitsOnly,
      });
      // eslint-disable-next-line no-console
      console.log(
        '[scan] Barcode charCodes:',
        barcode
          .split('')
          .slice(0, 40)
          .map((c) => c.charCodeAt(0)),
      );

      // Relaxed length check: allow any barcode that resolved to at least 1 digit or character.
      if (!barcode) return;

      const now = Date.now();
      if (lastBarcodeRef.current === barcodeForCooldown && now - lastScanTimeRef.current < SCAN_COOLDOWN_MS) {
        return;
      }
      lastBarcodeRef.current = barcodeForCooldown;
      lastScanTimeRef.current = now;

      isProcessingScanRef.current = true;
      setScanning(false);
      setLoading(true);
      setProduct(null);
      setSheetState('product');
      setErrorMessage(undefined);
      setQuantity(1);

      fetchProductByBarcode(barcode)
        .then((p) => {
          setLoading(false);
          if (p) {
            // eslint-disable-next-line no-console
            console.log('[scan] Product found (client):', p);
            setProduct(p);
            setSheetState('product');
          } else {
            // eslint-disable-next-line no-console
            console.log('[scan] Product not found (client) for barcode:', barcode);
            setSheetState('not_found');
          }
          // eslint-disable-next-line no-console
          console.log('[scan] Opening product details sheet');
          setDetailsVisible(true);
          setScanning(false);
          isProcessingScanRef.current = false;
        })
        .catch((err) => {
          setLoading(false);
          // eslint-disable-next-line no-console
          console.log('[scan] Product lookup error (client):', err);
          setErrorMessage(err?.message ?? t('scanContent.network_error'));
          setSheetState('error');
          Alert.alert(t('scanContent.alert_scan_error_title'), err?.message ?? t('scanContent.network_error'));
          lastBarcodeRef.current = null;
          setScanning(true);
          setScanning(false);
          isProcessingScanRef.current = false;
        });
    },
    [detailsVisible, scanning, loading, t]
  );

  const handleCloseDetails = useCallback(() => {
    setDetailsVisible(false);
    setProduct(null);
    setErrorMessage(undefined);
    setSheetState('product');
    setQuantity(1);
    lastBarcodeRef.current = null;
    isProcessingScanRef.current = false;
    setScanning(true);
  }, []);

  // note: not-found/error are handled inline in the scan handler now

  const handleAddToCart = useCallback(async () => {
    const p = product;
    if (!p) return;
    const stock = typeof p.stockQuantity === 'number' ? p.stockQuantity : undefined;
    const q = Math.max(1, Math.floor(quantity));
    if (typeof stock === 'number' && stock <= 0) {
      Alert.alert(t('scanContent.alert_out_stock_title'), t('scanContent.alert_out_stock_body'));
      return;
    }
    if (typeof stock === 'number' && q > stock) {
      Alert.alert(t('scanContent.alert_stock_title'), t('scanContent.alert_stock_body', { stock }));
      return;
    }

    const unitPrice =
      p.hasDiscount && typeof p.discountedPrice === 'number'
        ? p.discountedPrice
        : typeof p.originalPrice === 'number'
          ? p.originalPrice
          : p.price;

    try {
      // ── Shared session path ──────────────────────────────────────────────
      if (sharedSessionId) {
        const profile = auth?.userProfile;
        const userId = auth?.currentUser?.id ?? profile?.id ?? 'unknown';
        const addedByName =
          profile?.fullName ||
          `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() ||
          profile?.email ||
          'Me';

        await addItemToSharedSession(sharedSessionId, {
          productId: p.id,
          name: p.name,
          price: unitPrice,
          quantity: q,
          addedBy: userId,
          addedByName,
        });

        const updated = await getSharedSession(sharedSessionId);
        getSocket().emit('session:update', { sessionId: sharedSessionId, session: updated });

        void playAddToCartChime();
        setToastVisible(true);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => {
          setToastVisible(false);
          handleCloseDetails();
          if (closeAfterAdd) onBack();
          toastTimeoutRef.current = null;
        }, TOAST_DURATION_MS);
        return;
      }

      // ── Personal cart path ───────────────────────────────────────────────
      if (budget?.isActive) {
        const result = budget.addExpense(unitPrice * q);
        if (!result.ok) {
          budgetShake.value = withSequence(
            withTiming(-10, { duration: 70 }),
            withTiming(10, { duration: 70 }),
            withTiming(-8, { duration: 70 }),
            withTiming(8, { duration: 70 }),
            withTiming(0, { duration: 90 })
          );
          Alert.alert(t('scanContent.alert_budget_item_title'), t('scanContent.alert_budget_item_body'));
          setScanning(false);
          return;
        }

        const fullyUsed = budget.budget > 0 && budget.currentSpent + unitPrice * q >= budget.budget;
        if (fullyUsed) {
          budgetSuccessOpacity.value = withTiming(1, { duration: 250 });
          Alert.alert(t('scanContent.alert_budget_full_title'), t('scanContent.alert_budget_full_body'));
          setScanning(false);
        }
      }

      cart?.addToCart(p, q, { unitPrice });
      personalCart?.addItem({
        id: p.id,
        name: p.name,
        price: unitPrice,
        quantity: q,
        emoji: '🛒',
      });

      setToastVisible(true);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setToastVisible(false);
        handleCloseDetails();
        if (closeAfterAdd) onBack();
        toastTimeoutRef.current = null;
      }, TOAST_DURATION_MS);
    } catch (err: any) {
      Alert.alert(t('scanContent.alert_add_error_title'), err?.message ?? t('scanContent.alert_add_error_body'));
    }
  }, [
    product,
    quantity,
    sharedSessionId,
    auth,
    cart,
    personalCart,
    budget,
    budgetShake,
    budgetSuccessOpacity,
    handleCloseDetails,
    closeAfterAdd,
    onBack,
    t,
  ]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  if (!permission) {
    return (
      <View style={[styles.centerScreen, { backgroundColor: C.background }]}>
        <Text style={[styles.loadingText, { color: C.textSecondary }]}>{t('scanContent.checking_perm')}</Text>
      </View>
    );
  }

  if (!permission.granted) {
    const permGrad = isThemeDark
      ? (['#0A0A0F', '#0D1117', '#0A0E1A'] as const)
      : (['#EEF2FF', '#F5F0FF', '#EFF6FF'] as const);
    return (
      <LinearGradient colors={permGrad} style={styles.container}>
        <StatusBar style={isThemeDark ? 'light' : 'dark'} />
        <View style={[styles.permissionDenied, { paddingTop: insets.top + Spacing.md }]}>
          <View style={[styles.permissionIconWrap, { backgroundColor: isThemeDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,122,255,0.12)' }]}>
            <Ionicons name="camera-outline" size={40} color={Colors.accent.primary} />
          </View>
          <Text style={[styles.permissionTitle, { color: C.text }]}>{t('scanContent.cam_needed_title')}</Text>
          <Text style={[styles.permissionMessage, { color: C.textSecondary }]}>{t('scanContent.cam_needed_body')}</Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: Colors.accent.primary }]}
            onPress={requestPermission}
            activeOpacity={0.9}
          >
            <Text style={styles.permissionButtonText}>{t('scanContent.grant')}</Text>
          </TouchableOpacity>
          <Pressable onPress={onBack} style={styles.backButtonAlt} hitSlop={12}>
            <Ionicons name="chevron-back" size={20} color={Colors.accent.primary} />
            <Text style={[styles.backButtonAltText, { color: Colors.accent.primary }]}>{t('scanContent.back')}</Text>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Animated.View style={[styles.cameraWrap, cameraAnimatedStyle]}>
        <CameraView
          style={styles.camera}
          facing="back"
          autofocus="off"
          enableTorch={Platform.OS !== 'web' && torchEnabled}
          flash={Platform.OS === 'web' ? (torchEnabled ? ('torch' as any) : 'off') : 'off'}
          zoom={closeUpZoom ? SCAN_CLOSE_ZOOM : 0}
          barcodeScannerSettings={{
            barcodeTypes: PRODUCT_BARCODE_TYPES,
          }}
          // Keep listener always attached; we gate inside handler for reliability on some Android devices.
          onBarcodeScanned={handleBarcodeScanned}
        />
      </Animated.View>

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]} pointerEvents="box-none">
        <View style={styles.headerRow}>
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={t('scanContent.go_back_a11y')}
            style={({ pressed }) => [styles.viewfinderTopChrome, { opacity: pressed ? 0.88 : 1 }]}
          >
            <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.04)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.chromeGradient}
            />
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
            <View style={styles.chromeTextCol}>
              <Text style={styles.chromeKicker}>{t('scanContent.chrome_kicker')}</Text>
              <Text style={styles.chromeTitle}>{t('scanContent.chrome_title')}</Text>
            </View>
          </Pressable>

          <View style={styles.headerTools}>
            <Pressable
              onPress={() => setTorchEnabled((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={t('scanContent.torch_a11y')}
              accessibilityState={{ selected: torchEnabled }}
              hitSlop={12}
              style={({ pressed }) => [
                styles.toolChrome,
                torchEnabled && styles.toolChromeActive,
                { opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <Ionicons
                name={torchEnabled ? 'flashlight' : 'flashlight-outline'}
                size={22}
                color="#FFFFFF"
              />
            </Pressable>
            <Pressable
              onPress={() => setCloseUpZoom((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={t('scanContent.zoom_in_a11y')}
              accessibilityState={{ selected: closeUpZoom }}
              hitSlop={12}
              style={({ pressed }) => [
                styles.toolChrome,
                closeUpZoom && styles.toolChromeActive,
                { opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <Ionicons name="scan-outline" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
        <Text style={styles.curvedHint} numberOfLines={2}>
          {t('scanContent.curved_hint')}
        </Text>
      </View>

      <ScannerOverlay scanning={scanning} scanLineVisible={!loading} />

      <LoadingOverlay visible={loading} message={t('scanContent.loading_lookup')} />

      {budget?.isActive && (
        <Animated.View
          style={[
            styles.budgetHudWrap,
            budgetShakeStyle,
            { bottom: (Platform.OS === 'ios' ? 28 : 22) + insets.bottom },
          ]}
        >
          <BlurView intensity={28} tint="dark" style={styles.budgetBlur}>
            <LinearGradient
              colors={['rgba(0,122,255,0.12)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.budgetHud}
            >
              <View style={styles.budgetRow}>
                <View style={styles.budgetMetric}>
                  <Text style={styles.budgetLabel}>{t('scanContent.hud_budget')}</Text>
                  <Text style={styles.budgetValue}>{formatLkr(budget.budget)}</Text>
                </View>
                <View style={styles.budgetMetric}>
                  <Text style={styles.budgetLabel}>{t('scanContent.hud_spent')}</Text>
                  <Text style={styles.budgetValue}>{formatLkr(budget.currentSpent)}</Text>
                </View>
                <View style={styles.budgetMetric}>
                  <Text style={styles.budgetLabel}>{t('scanContent.hud_remaining')}</Text>
                  <Text style={[styles.budgetValue, budget.remaining <= 0 && styles.budgetDanger]}>
                    {formatLkr(budget.remaining)}
                  </Text>
                </View>
              </View>
              <AnimatedProgressBar progress={budget.progress} />
              {!scanning && budget.remaining <= 0 && (
                <Animated.View style={[styles.budgetSuccess, budgetSuccessStyle]}>
                  <Text style={styles.budgetSuccessText}>{t('scanContent.budget_limit_msg')}</Text>
                </Animated.View>
              )}
            </LinearGradient>
          </BlurView>
        </Animated.View>
      )}

      <AddToCartToast visible={toastVisible} />

      <ProductDetailsModal
        visible={detailsVisible}
        loading={loading}
        errorCode={sheetState === 'not_found' ? 'not_found' : sheetState === 'error' ? 'network' : null}
        errorDetail={sheetState === 'error' ? errorMessage ?? null : null}
        product={product}
        quantity={quantity}
        onChangeQuantity={setQuantity}
        onClose={handleCloseDetails}
        onConfirm={() => void handleAddToCart()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.base,
  },
  cameraWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  camera: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    zIndex: 100,
    elevation: Platform.OS === 'android' ? 24 : 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  headerTools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    zIndex: 2,
  },
  toolChrome: {
    width: 48,
    height: 48,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  toolChromeActive: {
    borderColor: 'rgba(0,122,255,0.55)',
    backgroundColor: 'rgba(0,122,255,0.15)',
  },
  curvedHint: {
    marginTop: Spacing.sm,
    marginRight: 56,
    fontFamily: Typography.fonts.secondary,
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 16,
  },
  viewfinderTopChrome: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    gap: 10,
  },
  chromeGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  chromeTextCol: {
    gap: 1,
  },
  chromeKicker: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.4,
  },
  chromeTitle: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: 17,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  permissionDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  permissionIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  permissionTitle: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: Typography.sizes['2xl'],
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  permissionMessage: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.base,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  permissionButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 12,
    backgroundColor: Colors.accent.primary,
    marginBottom: Spacing.md,
  },
  permissionButtonText: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
    color: '#FFFFFF',
  },
  backButtonAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  backButtonAltText: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
  },
  budgetHudWrap: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    borderRadius: 22,
    overflow: 'hidden',
    zIndex: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  budgetBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  budgetHud: {
    padding: Spacing.md,
    borderRadius: 20,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  budgetMetric: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  budgetLabel: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.xs,
    color: Colors.dark.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  budgetValue: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.sm,
    color: Colors.dark.text,
  },
  budgetDanger: {
    color: '#FF4D7D',
  },
  budgetSuccess: {
    marginTop: Spacing.sm,
  },
  budgetSuccessText: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.sm,
    color: Colors.accent.neon,
  },
});
