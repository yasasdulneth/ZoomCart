import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { Colors, Typography, Spacing, BorderRadius, BlurIntensity } from '../../constants/theme';
import type { MeProfile } from '../../context/FriendContext';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');
const QR_SIZE = Math.min(220, Math.round(width * 0.55));

interface FriendQRModalProps {
  visible: boolean;
  onClose: () => void;
  getOrCreateMe: () => Promise<MeProfile>;
}

export default function FriendQRModal({ visible, onClose, getOrCreateMe }: FriendQRModalProps) {
  const [me, setMe] = useState<MeProfile | null>(null);
  const auth = useAuth();

  useEffect(() => {
    if (!visible) {
      setMe(null);
      return;
    }
    let cancelled = false;

    const resolve = async () => {
      // Prefer the real authenticated user profile so friends see the actual name
      if (auth?.userProfile) {
        const profile = auth.userProfile;
        const resolved: MeProfile = {
          id: profile.id,
          name: profile.fullName || `${profile.firstName} ${profile.lastName}`.trim() || 'User',
          phone: profile.mobileNumber ?? '',
        };
        if (!cancelled) setMe(resolved);
        return;
      }
      // Fallback: anonymous local profile
      const profile = await getOrCreateMe();
      if (!cancelled) setMe(profile);
    };

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [visible, getOrCreateMe, auth?.userProfile]);

  const qrValue = me
    ? JSON.stringify({
        id: me.id,
        userId: me.id,
        name: me.name,
        phone: me.phone,
        phoneNumber: me.phone })
    : '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.contentWrap} onPress={(e) => e.stopPropagation()}>
          <BlurView intensity={BlurIntensity.medium} tint="dark" style={styles.blur}>
            <LinearGradient
              colors={[Colors.glass.medium, Colors.glass.dark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <Text style={styles.title}>Scan to Add Me</Text>
              <Text style={styles.subtitle}>Let a friend scan this QR to add you</Text>
              <View style={styles.qrSurface}>
                {qrValue ? (
                  <QRCode
                    value={qrValue}
                    size={QR_SIZE}
                    backgroundColor="#FFFFFF"
                    color="#0A0A0F"
                    quietZone={10}
                  />
                ) : (
                  <View style={styles.placeholder}>
                    <Text style={styles.placeholderText}>Loading…</Text>
                  </View>
                )}
              </View>
              {me && (
                <Text style={styles.name} numberOfLines={1}>
                  {me.name}
                </Text>
              )}
              <Pressable style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  contentWrap: {
    width: '100%',
    maxWidth: 340,
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
    alignItems: 'center',
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
  qrSurface: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    overflow: 'hidden',
  },
  placeholder: {
    width: QR_SIZE,
    height: QR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.base,
    color: Colors.dark.textSecondary,
  },
  name: {
    fontFamily: Typography.fonts.primaryMedium,
    fontSize: Typography.sizes.base,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.md,
    maxWidth: '100%',
  },
  closeButton: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  closeText: {
    fontFamily: Typography.fonts.primaryMedium,
    fontSize: Typography.sizes.base,
    color: Colors.dark.text,
  },
});
