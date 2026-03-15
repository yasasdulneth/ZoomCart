import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Vibration,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { fetchProductByBarcode } from '../../lib/api/products';
import type { Product } from '../../lib/api/products';
import { Colors, Typography, Spacing, BorderRadius, BlurIntensity } from '../../constants/theme';
import { PRODUCT_BARCODE_TYPES, SCAN_CLOSE_ZOOM } from '../../constants/productScanner';
import ScannerOverlay from '../scanner/ScannerOverlay';
import AnimatedButton from '../AnimatedButton';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_MAX_WIDTH = Math.min(SCREEN_WIDTH - Spacing['2xl'], 420);
// Ensure the camera preview isn't squashed on smaller devices / nested modals.
const CAMERA_SHELL_HEIGHT = Math.max(280, Math.min(SCREEN_HEIGHT * 0.5, 380));
const CAMERA_SHELL_WIDTH = CARD_MAX_WIDTH - Spacing.xl * 2;
const SCAN_COOLDOWN_MS = 1500;

function normalizeBarcode(value: unknown) {
  const raw = String(value ?? '');
  const trimmed = raw.trim();
  const noSpaces = trimmed.replace(/\s+/g, '');
  const digitsOnly = noSpaces.replace(/[^\d]/g, '');
  return { raw, trimmed, noSpaces, digitsOnly };
}

function getProductEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('milk')) return '🥛';
  if (n.includes('bread') || n.includes('avocado')) return n.includes('avocado') ? '🥑' : '🍞';
  if (n.includes('avocado')) return '🥑';
  if (n.includes('egg')) return '🥚';
  if (n.includes('butter')) return '🧈';
  return '🛒';
}

export interface ScanProductModalCartItem {
  name: string;
  price: number;
  quantity: number;
  emoji: string;
}

interface ScanProductModalProps {
  visible: boolean;
  onClose: () => void;
  onAddToCart: (item: ScanProductModalCartItem) => void;
}

type Step = 'camera' | 'quantity';

export default function ScanProductModal({
  visible,
  onClose,
  onAddToCart,
}: ScanProductModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>('camera');
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [debugBarcode, setDebugBarcode] = useState<string>('');
  const [debugLen, setDebugLen] = useState<number>(0);
  const [debugStatus, setDebugStatus] = useState<'idle' | 'scanned' | 'fetching' | 'found' | 'not_found' | 'error'>(
    'idle',
  );
  const [debugDigits, setDebugDigits] = useState<string>('');
  const [debugEventType, setDebugEventType] = useState<string>('');
  const [debugCount, setDebugCount] = useState<number>(0);
  const [debugLastAt, setDebugLastAt] = useState<number>(0);
  const [manualBarcode, setManualBarcode] = useState('');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [closeUpZoom, setCloseUpZoom] = useState(false);
  const isProcessingRef = useRef(false);
  const lastBarcodeRef = useRef('');
  const lastScanAtRef = useRef(0);

  useEffect(() => {
    if (!visible) {
      setStep('camera');
      setScanning(true);
      setLoading(false);
      setError(null);
      setProduct(null);
      setQuantity(1);
      setDebugBarcode('');
      setDebugLen(0);
      setDebugStatus('idle');
      setDebugDigits('');
      setDebugEventType('');
      setDebugCount(0);
      setDebugLastAt(0);
      setManualBarcode('');
      setTorchEnabled(false);
      setCloseUpZoom(false);
      return;
    }
    if (!permission?.granted) void requestPermission?.();
  }, [visible, permission, requestPermission]);

  const runLookup = useCallback(
    async (barcodeInput: string) => {
      const n = normalizeBarcode(barcodeInput);
      const barcode = n.trimmed;
      if (!barcode) return;

      setDebugBarcode(barcode);
      setDebugLen(barcode.length);
      setDebugStatus('fetching');
      setLoading(true);
      setError(null);

      try {
        // Fail fast with a visible error if network hangs.
        const p = await Promise.race([
          fetchProductByBarcode(barcode),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('Lookup timed out. Check backend IP / firewall.')), 8000),
          ),
        ]);
        setLoading(false);
        if (p) {
          setProduct(p);
          setQuantity(1);
          setStep('quantity');
          setDebugStatus('found');
        } else {
          setDebugStatus('not_found');
          setError('Product not found');
          setScanning(true);
        }
      } catch (err: any) {
        setLoading(false);
        setDebugStatus('error');
        setError(err?.message ?? 'Could not load product');
        setScanning(true);
      }
    },
    [],
  );

  const handleClose = useCallback(() => {
    setStep('camera');
    setProduct(null);
    setQuantity(1);
    setError(null);
    onClose();
  }, [onClose]);

  const handleBarcodeScanned = useCallback(
    async (result: any) => {
      if (!scanning || loading) return;
      if (isProcessingRef.current) return;

      setDebugCount((c) => c + 1);
      setDebugLastAt(Date.now());

      // 1) Log the full scanner event object
      try {
        // eslint-disable-next-line no-console
        console.log('SCAN EVENT:', JSON.stringify(result, null, 2));
      } catch {
        // ignore
      }

      // 2) Extract barcode safely
      const scannedValue =
        result?.data || result?.rawValue || result?.value || result?.nativeEvent?.data;
      const n = normalizeBarcode(scannedValue);
      // Prefer digits-only for product lookup to avoid QR/URL false positives.
      const digits = n.digitsOnly;
      const barcode = digits || n.trimmed;
      const cooldownKey = digits || n.noSpaces || n.trimmed;
      setDebugEventType(String(result?.type ?? ''));

      // 4) Log normalized barcode and length
      // eslint-disable-next-line no-console
      console.log('Normalized barcode:', barcode);
      // eslint-disable-next-line no-console
      console.log('Barcode length:', barcode.length);
      // eslint-disable-next-line no-console
      console.log('[scan] Barcode candidates:', { trimmed: n.trimmed, noSpaces: n.noSpaces, digitsOnly: n.digitsOnly });

      // Relaxed length check.
      if (!barcode) {
        setDebugBarcode(barcode);
        setDebugLen(barcode.length);
        setDebugDigits(digits || '');
        setDebugStatus('idle');
        setError(null);
        setScanning(true);
        return;
      }

      // Give immediate physical feedback so you can tell scanning fired.
      Vibration.vibrate(50);

      setDebugBarcode(digits);
      setDebugLen(digits.length);
      setDebugDigits(digits);
      setDebugStatus('scanned');

      const now = Date.now();
      if (lastBarcodeRef.current === cooldownKey && now - lastScanAtRef.current < SCAN_COOLDOWN_MS) return;
      lastBarcodeRef.current = cooldownKey;
      lastScanAtRef.current = now;

      isProcessingRef.current = true;
      setScanning(false);
      setDebugStatus('fetching');
      setLoading(true);
      setError(null);

      try {
        await runLookup(barcode);
      } catch (err: any) {
        setLoading(false);
        // eslint-disable-next-line no-console
        console.log('[scan] Lookup error (modal):', err);
        setError(err?.message ?? 'Could not load product');
        setScanning(true);
      } finally {
        isProcessingRef.current = false;
      }
    },
    [scanning, loading, runLookup]
  );

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    onAddToCart({
      name: product.name,
      price: product.price,
      quantity,
      emoji: getProductEmoji(product.name),
    });
    handleClose();
  }, [product, quantity, onAddToCart, handleClose]);

  const handleRescan = useCallback(() => {
    setStep('camera');
    setScanning(true);
    setLoading(false);
    setError(null);
    setProduct(null);
    setQuantity(1);
    setDebugStatus('idle');
    lastBarcodeRef.current = '';
    lastScanAtRef.current = 0;
  }, []);

  const renderCameraContent = () => {
    if (!permission) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator color={Colors.accent.neon} />
          <Text style={styles.helperText}>Checking camera…</Text>
        </View>
      );
    }
    if (!permission.granted) {
      return (
        <View style={styles.centerContent}>
          <Text style={styles.helperTitle}>Camera needed</Text>
          <Text style={styles.helperText}>Enable camera to scan product barcodes.</Text>
          <Pressable style={styles.permissionButton} onPress={() => void requestPermission?.()}>
            <Text style={styles.permissionButtonText}>Enable Camera</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          autofocus="off"
          enableTorch={Platform.OS !== 'web' && torchEnabled}
          flash={Platform.OS === 'web' ? (torchEnabled ? ('torch' as any) : 'off') : 'off'}
          zoom={closeUpZoom ? SCAN_CLOSE_ZOOM : 0}
          onBarcodeScanned={handleBarcodeScanned}
          barcodeScannerSettings={{ barcodeTypes: PRODUCT_BARCODE_TYPES }}
        />
        <View style={styles.cameraTools} pointerEvents="box-none">
          <Pressable
            onPress={() => setTorchEnabled((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Toggle flashlight for curved or dark labels"
            hitSlop={12}
            style={({ pressed }) => [
              styles.cameraToolBtn,
              torchEnabled && styles.cameraToolBtnActive,
              { opacity: pressed ? 0.9 : 1 },
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
            accessibilityLabel="Zoom in slightly for small or curved packages"
            hitSlop={12}
            style={({ pressed }) => [
              styles.cameraToolBtn,
              closeUpZoom && styles.cameraToolBtnActive,
              { opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Ionicons name="scan-outline" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
        {loading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={Colors.accent.neon} size="large" />
            <Text style={styles.loadingText}>Looking up product…</Text>
          </View>
        ) : (
          <ScannerOverlay
            scanning={scanning}
            containerWidth={CAMERA_SHELL_WIDTH}
            containerHeight={CAMERA_SHELL_HEIGHT}
          />
        )}
      </View>
    );
  };

  const renderQuantityContent = () => {
    if (!product) return null;
    return (
      <View style={styles.quantitySection}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.quantityPrompt}>
          How many do you want?
        </Text>
        <View style={styles.quantityRow}>
          <Pressable
            style={[styles.quantityBtn, quantity <= 1 && styles.quantityBtnDisabled]}
            onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
          >
            <Text style={styles.quantityBtnText}>−</Text>
          </Pressable>
          <Text style={styles.quantityValue}>{quantity}</Text>
          <Pressable
            style={styles.quantityBtn}
            onPress={() => setQuantity((q) => Math.min(99, q + 1))}
          >
            <Text style={styles.quantityBtnText}>+</Text>
          </Pressable>
        </View>
        <Text style={styles.priceLine}>
          LKR {(product.price * quantity).toFixed(2)} total
        </Text>
        <AnimatedButton
          title="Add to cart"
          onPress={handleAddToCart}
          size="medium"
          style={styles.addToCartButton}
        />
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable
        style={styles.backdrop}
        onPress={() => {
          // Prevent accidental dismiss while scanning result is being processed / quantity step is open.
          if (loading) return;
          if (step !== 'camera') return;
          handleClose();
        }}
      >
        <Pressable style={styles.dialogWrapper} onPress={(e) => e.stopPropagation()}>
          <BlurView intensity={BlurIntensity.medium} tint="dark" style={styles.blur}>
            <LinearGradient
              colors={[Colors.glass.medium, Colors.glass.dark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <Text style={styles.title}>
                {step === 'camera' ? 'Scan Product' : 'Add to cart'}
              </Text>

              {step === 'camera' && (
                <>
                  <Text style={styles.subtitle}>
                    Scan a product barcode to add it to your cart
                  </Text>
                  <View style={styles.cameraShell}>{renderCameraContent()}</View>
                  {!!error && <Text style={styles.errorText}>{error}</Text>}

                  <View style={styles.debugBox}>
                    <Text style={styles.debugTitle}>Scanner debug</Text>
                    <Text style={styles.debugLine}>Status: {debugStatus}</Text>
                    <Text style={styles.debugLine}>Type: {debugEventType || '—'}</Text>
                    <Text style={styles.debugLine}>Barcode: {debugBarcode || '—'}</Text>
                    <Text style={styles.debugLine}>Digits: {debugDigits || '—'}</Text>
                    <Text style={styles.debugLine}>Length: {debugLen || 0}</Text>
                    <Text style={styles.debugLine}>Events: {debugCount}</Text>
                    <Text style={styles.debugLine}>
                      Last: {debugLastAt ? new Date(debugLastAt).toLocaleTimeString() : '—'}
                    </Text>
                  </View>

                  <View style={styles.manualRow}>
                    <TextInput
                      value={manualBarcode}
                      onChangeText={setManualBarcode}
                      placeholder="Enter barcode manually"
                      placeholderTextColor={Colors.dark.textTertiary}
                      style={styles.manualInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Pressable
                      style={[styles.manualBtn, !manualBarcode.trim() && styles.manualBtnDisabled]}
                      onPress={() => void runLookup(manualBarcode)}
                      disabled={!manualBarcode.trim()}
                    >
                      <Text style={styles.manualBtnText}>Search</Text>
                    </Pressable>
                  </View>

                  <View style={styles.rescanRow}>
                    <Pressable
                      style={styles.rescanBtn}
                      onPress={() => {
                        setError(null);
                        setProduct(null);
                        setQuantity(1);
                        setScanning(true);
                        setDebugStatus('idle');
                        lastBarcodeRef.current = '';
                        lastScanAtRef.current = 0;
                      }}
                    >
                      <Text style={styles.rescanText}>Rescan</Text>
                    </Pressable>
                  </View>
                </>
              )}

              {step === 'quantity' && renderQuantityContent()}

              <Pressable style={styles.closeButton} onPress={handleClose}>
                <Text style={styles.closeText}>Close</Text>
              </Pressable>

              {step === 'quantity' && (
                <Pressable style={styles.rescanInline} onPress={handleRescan}>
                  <Text style={styles.rescanInlineText}>Scan another</Text>
                </Pressable>
              )}
            </LinearGradient>
          </BlurView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  dialogWrapper: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
  },
  blur: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  card: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  title: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.xl,
    color: Colors.dark.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.lg,
  },
  cameraShell: {
    // Avoid clipping the native camera surface on iOS (can prevent barcode callbacks on some devices).
    borderRadius: BorderRadius.lg,
    overflow: 'visible',
    backgroundColor: 'transparent',
    width: '100%',
    height: CAMERA_SHELL_HEIGHT,
    minHeight: 280,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  cameraTools: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'column',
    gap: Spacing.xs,
    zIndex: 20,
    elevation: Platform.OS === 'android' ? 16 : 0,
  },
  cameraToolBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraToolBtnActive: {
    borderColor: 'rgba(0,122,255,0.6)',
    backgroundColor: 'rgba(0,122,255,0.25)',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  helperTitle: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.lg,
    color: Colors.dark.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  helperText: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  permissionButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accent.primary,
  },
  permissionButtonText: {
    fontFamily: Typography.fonts.primaryMedium,
    fontSize: Typography.sizes.base,
    color: Colors.dark.text,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    color: Colors.dark.textSecondary,
  },
  errorText: {
    marginTop: Spacing.md,
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    color: '#F97373',
    textAlign: 'center',
  },
  debugBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  debugTitle: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.sm,
    color: Colors.dark.text,
    marginBottom: 6,
  },
  debugLine: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.xs,
    color: Colors.dark.textSecondary,
    marginBottom: 2,
  },
  manualRow: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  manualInput: {
    flex: 1,
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.base,
    color: Colors.dark.text,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  manualBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(0,245,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.26)',
  },
  manualBtnDisabled: { opacity: 0.5 },
  manualBtnText: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.sm,
    color: Colors.accent.neon,
  },
  rescanRow: { marginTop: Spacing.sm, alignItems: 'center' },
  rescanBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  rescanText: {
    fontFamily: Typography.fonts.primaryMedium,
    fontSize: Typography.sizes.sm,
    color: Colors.dark.textSecondary,
  },
  quantitySection: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  productName: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.lg,
    color: Colors.dark.text,
    marginBottom: Spacing.sm,
  },
  quantityPrompt: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.base,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.lg,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  quantityBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityBtnDisabled: {
    opacity: 0.5,
  },
  quantityBtnText: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes['2xl'],
    color: '#FFFFFF',
  },
  quantityValue: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes['2xl'],
    color: Colors.dark.text,
    marginHorizontal: Spacing.xl,
    minWidth: 40,
    textAlign: 'center',
  },
  priceLine: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.base,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  addToCartButton: {
    alignSelf: 'stretch',
  },
  closeButton: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignSelf: 'center',
  },
  closeText: {
    fontFamily: Typography.fonts.primaryMedium,
    fontSize: Typography.sizes.base,
    color: Colors.dark.text,
  },
  rescanInline: {
    marginTop: Spacing.sm,
    alignSelf: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  rescanInlineText: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    color: Colors.dark.textSecondary,
    textDecorationLine: 'underline',
  },
});
