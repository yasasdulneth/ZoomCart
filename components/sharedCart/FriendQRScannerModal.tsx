import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions, type BarcodeType } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { Colors, Typography, Spacing, BorderRadius, BlurIntensity } from '../../constants/theme';
import { useFriends } from '../../context/FriendContext';
import { useAuthOptional } from '../../context/AuthContext';
import { addFriend as saveFriendToService } from '../../lib/services/friends.service';
import ScannerOverlay from '../scanner/ScannerOverlay';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_MAX_WIDTH = Math.min(SCREEN_WIDTH - Spacing['2xl'], 420);
const CAMERA_SHELL_HEIGHT = Math.min(SCREEN_HEIGHT * 0.4, 300);
const CAMERA_SHELL_WIDTH = CARD_MAX_WIDTH - Spacing.xl * 2;
const QR_SIZE = Math.min(180, Math.round(CARD_MAX_WIDTH * 0.5));

const BARCODE_TYPES = ['qr'] as const;

interface MutualStep {
  friendName: string;
}

interface FriendQRScannerModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function FriendQRScannerModal({ visible, onClose }: FriendQRScannerModalProps) {
  const { friends, addFriend } = useFriends();
  const auth = useAuthOptional();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutualStep, setMutualStep] = useState<MutualStep | null>(null);

  // Build this user's own QR payload so the friend can scan back
  const myQrValue = useMemo(() => {
    const profile = auth?.userProfile;
    if (!profile) return '';
    const id = profile.id;
    const name =
      profile.fullName ||
      `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() ||
      'User';
    const phone = profile.mobileNumber ?? '';
    return JSON.stringify({ id, userId: id, name, phone, phoneNumber: phone });
  }, [auth?.userProfile]);

  useEffect(() => {
    if (!visible) return;
    setScanning(true);
    setError(null);
    setMutualStep(null);

    if (!permission) return;
    if (!permission.granted) void requestPermission();
  }, [visible, permission, requestPermission]);

  const handleClose = useCallback(() => {
    setScanning(false);
    setError(null);
    setMutualStep(null);
    onClose();
  }, [onClose]);

  const handleBarcodeScanned = useCallback(
    async (result: Record<string, unknown>) => {
      if (!scanning) return;

      // Defensive extraction — expo-camera may use different field names across versions
      const raw = (
        (result?.data as string) ||
        (result?.rawValue as string) ||
        (result?.value as string) ||
        ((result?.nativeEvent as Record<string, unknown>)?.data as string) ||
        ''
      ).trim();

      if (!raw) return;
      setScanning(false);

      try {
        // QR payloads come in two formats:
        //  Format A (FriendQRModal / FriendContext): { id, name, phone }
        //  Format B (SharedCartSetupScreen):         { userId, name, phoneNumber }
        let rawParsed: Record<string, unknown> | null = null;
        try {
          rawParsed = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          // Not JSON — treat the raw string as a plain user ID
        }

        let friendId: string;
        let friendName: string;
        let friendPhone: string;

        if (rawParsed && typeof rawParsed === 'object') {
          const id =
            (rawParsed.id as string | undefined) ||
            (rawParsed.userId as string | undefined);
          if (!id || typeof id !== 'string' || id.trim() === '') {
            throw new Error('Unrecognised QR format');
          }
          friendId = id.trim();
          friendName =
            ((rawParsed.name as string | undefined) ?? '').trim() || 'Friend';
          friendPhone = (
            (rawParsed.phone as string | undefined) ||
            (rawParsed.phoneNumber as string | undefined) ||
            ''
          ).trim();
        } else if (raw.length > 0 && !raw.startsWith('http')) {
          friendId = raw;
          friendName = 'Friend';
          friendPhone = '';
        } else {
          throw new Error('Unrecognised QR format');
        }

        // Write to BOTH storage layers so the friend appears everywhere in the app
        // 1. friends.service.ts (v2 key) — used by SharedCartSetupScreen
        await saveFriendToService({ id: friendId, name: friendName, phoneNumber: friendPhone });

        // 2. FriendContext (v1 key) — used by SharedCartScreen
        const existingInCtx = friends.find((f) => f.id === friendId);
        if (!existingInCtx) {
          await addFriend({ id: friendId, name: friendName, phone: friendPhone, avatar: '' });
        }

        // Move to mutual-add step so this user can show their own QR back
        setMutualStep({ friendName });
      } catch {
        setError('Could not read this QR. Make sure your friend shows their "Add Me" QR.');
      }
    },
    [scanning, friends, addFriend]
  );

  // ─── Mutual-add step ────────────────────────────────────────────────────────
  const renderMutualStep = () => (
    <ScrollView contentContainerStyle={styles.mutualScroll} showsVerticalScrollIndicator={false}>
      <Text style={styles.successEmoji}>✅</Text>
      <Text style={styles.successTitle}>
        {mutualStep?.friendName ?? 'Friend'} added!
      </Text>
      <Text style={styles.mutualSubtitle}>
        Now show your QR to{' '}
        <Text style={styles.mutualName}>{mutualStep?.friendName ?? 'them'}</Text>
        {' '}so they can add you back.
      </Text>

      {myQrValue ? (
        <View style={styles.qrSurface}>
          <QRCode
            value={myQrValue}
            size={QR_SIZE}
            backgroundColor="#FFFFFF"
            color="#0A0A0F"
            quietZone={10}
          />
        </View>
      ) : (
        <View style={styles.qrPlaceholder}>
          <Text style={styles.qrPlaceholderText}>Log in to show your QR</Text>
        </View>
      )}

      <Text style={styles.mutualHint}>
        Ask {mutualStep?.friendName ?? 'your friend'} to open Scan QR and scan this code.
      </Text>

      <Pressable style={styles.doneButton} onPress={handleClose}>
        <LinearGradient
          colors={[Colors.accent.primary, Colors.accent.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.doneGradient}
        >
          <Text style={styles.doneText}>Done</Text>
        </LinearGradient>
      </Pressable>
    </ScrollView>
  );

  // ─── Camera / scan step ─────────────────────────────────────────────────────
  const renderCameraContent = () => {
    if (!permission) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator color={Colors.accent.neon} />
          <Text style={styles.helperText}>Checking camera permission…</Text>
        </View>
      );
    }
    if (!permission.granted) {
      return (
        <View style={styles.centerContent}>
          <Text style={styles.helperTitle}>Camera access needed</Text>
          <Text style={styles.helperText}>
            Enable camera to scan your friend&apos;s QR code.
          </Text>
          <Pressable style={styles.permissionButton} onPress={() => void requestPermission()}>
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
          onBarcodeScanned={scanning ? handleBarcodeScanned : undefined}
          barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES as unknown as BarcodeType[] }}
        />
        <ScannerOverlay
          scanning={scanning}
          containerWidth={CAMERA_SHELL_WIDTH}
          containerHeight={CAMERA_SHELL_HEIGHT}
        />
      </View>
    );
  };

  const renderScanStep = () => (
    <>
      <Text style={styles.title}>Scan Friend QR</Text>
      <Text style={styles.subtitle}>
        Ask your friend to show their &quot;My QR&quot; code, then align it in the frame.
      </Text>

      <View style={styles.cameraShell}>{renderCameraContent()}</View>

      {!!error && (
        <>
          <Text style={styles.errorText} numberOfLines={3}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => { setError(null); setScanning(true); }}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </>
      )}

      <Pressable style={styles.closeButton} onPress={handleClose}>
        <Text style={styles.closeText}>Close</Text>
      </Pressable>
    </>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.dialogWrapper} onPress={(e) => e.stopPropagation()}>
          <BlurView intensity={BlurIntensity.medium} tint="dark" style={styles.blur}>
            <LinearGradient
              colors={[Colors.glass.medium, Colors.glass.dark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              {mutualStep ? renderMutualStep() : renderScanStep()}
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
    backgroundColor: 'rgba(0,0,0,0.75)',
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

  // ── Scan step ──
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
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
    height: CAMERA_SHELL_HEIGHT,
  },
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
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
  errorText: {
    marginTop: Spacing.md,
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    color: '#F97373',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accent.primary,
    alignSelf: 'center',
  },
  retryText: {
    fontFamily: Typography.fonts.primaryMedium,
    fontSize: Typography.sizes.base,
    color: Colors.dark.text,
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

  // ── Mutual-add step ──
  mutualScroll: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  successEmoji: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  successTitle: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.xl,
    color: Colors.dark.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  mutualSubtitle: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.base,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  mutualName: {
    fontFamily: Typography.fonts.primarySemiBold,
    color: Colors.accent.neon,
  },
  qrSurface: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  qrPlaceholder: {
    width: QR_SIZE + Spacing.md * 2,
    height: QR_SIZE + Spacing.md * 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  qrPlaceholderText: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  mutualHint: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    color: Colors.dark.textTertiary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  doneButton: {
    width: '100%',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  doneGradient: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  doneText: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
    color: '#FFFFFF',
  },
});
