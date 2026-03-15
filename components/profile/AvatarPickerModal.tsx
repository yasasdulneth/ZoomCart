import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { useResolvedTheme } from '../../context/ThemeContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Typography, Spacing, BorderRadius, BlurIntensity } from '../../constants/theme';
import { STOCK_AVATARS } from '../../constants/stockAvatars';

interface AvatarPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAvatar: (uri: string) => void | Promise<void>;
}

export default function AvatarPickerModal({
  visible,
  onClose,
  onSelectAvatar }: AvatarPickerModalProps) {
  const { isDark, colors: C } = useResolvedTheme();

  const translateY = useSharedValue(400);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 250 });
      translateY.value = withSpring(0, { damping: 26, stiffness: 220 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(400, { duration: 200 });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }] }));

  const notifySelect = async (uri: string) => {
    try {
      await Promise.resolve(onSelectAvatar(uri));
      onClose();
    } catch {
      Alert.alert('Photo', 'Could not apply this image.');
    }
  };

  const handleStockSelect = (uri: string) => {
    void notifySelect(uri);
  };

  const requestGalleryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Allow photo library access in Settings to choose your profile picture.',
        [{ text: 'OK' }],
      );
      return false;
    }
    return true;
  };

  const handleGallery = async () => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        selectionLimit: 1 });
      if (!result.canceled && result.assets[0]?.uri) {
        void notifySelect(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Gallery', 'Could not open your photo library. Try again.');
    }
  };

  const handleFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true });
      if (!result.canceled && result.assets[0]?.uri) {
        void notifySelect(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Files', 'Could not open the file picker. Try again.');
    }
  };

  if (!visible) return null;

  const gradientBottom = C.surface;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.sheet, sheetStyle]} pointerEvents="box-none">
        <BlurView intensity={BlurIntensity.heavy} tint={isDark ? 'dark' : 'light'} style={styles.blur}>
          <LinearGradient
            colors={[isDark ? 'rgba(44,44,46,0.92)' : 'rgba(255,255,255,0.95)', gradientBottom]}
            style={styles.gradient}
          >
            <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
            <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>Your photo</Text>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: Colors.accent.primary }]}
              onPress={handleGallery}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel="Choose from photo gallery"
            >
              <Ionicons name="images-outline" size={22} color="#FFFFFF" />
              <View style={styles.primaryTextCol}>
                <Text style={styles.primaryButtonTitle}>Choose from gallery</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
                  borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)' },
              ]}
              onPress={handleFiles}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Choose image from files"
            >
              <Ionicons name="folder-open-outline" size={20} color={Colors.accent.primary} />
              <Text style={[styles.secondaryButtonText, { color: C.text }]}>Browse files</Text>
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, { color: C.textSecondary, marginTop: Spacing.lg }]}>Stock avatars</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.stockScroll}
              style={styles.stockScrollView}
            >
              {STOCK_AVATARS.map((uri, index) => (
                <TouchableOpacity
                  key={`${uri}-${index}`}
                  style={[
                    styles.stockItem,
                    {
                      borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.10)' },
                  ]}
                  onPress={() => handleStockSelect(uri)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri }} style={styles.stockImage} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.8}>
              <Text style={[styles.cancelText, { color: C.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </LinearGradient>
        </BlurView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    overflow: 'hidden' },
  blur: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    overflow: 'hidden' },
  gradient: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl + (Platform.OS === 'ios' ? 28 : 16),
    paddingHorizontal: Spacing.lg },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.lg },
  sectionTitle: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm },
  primaryTextCol: {
    flex: 1 },
  primaryButtonTitle: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
    color: '#FFFFFF' },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm },
  secondaryButtonText: {
    fontFamily: Typography.fonts.primaryMedium,
    fontSize: Typography.sizes.base },
  stockScroll: {
    gap: Spacing.md,
    paddingBottom: Spacing.md },
  stockScrollView: {
    marginHorizontal: -Spacing.lg },
  stockItem: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    marginLeft: Spacing.lg,
    borderWidth: 2 },
  stockImage: {
    width: '100%',
    height: '100%' },
  cancelButton: {
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
    alignItems: 'center' },
  cancelText: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.base } });
