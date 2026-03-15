import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { fetchUserProfile, UserProfile } from '../../lib/api/profile';
import { getSavedProfileAvatar, saveProfileAvatarFromPicker } from '../../lib/services/localProfileAvatar.service';
import ProfileHeader from '../../components/profile/ProfileHeader';
import AvatarPickerModal from '../../components/profile/AvatarPickerModal';
import InfoCard from '../../components/profile/InfoCard';
import LoyaltyPointsCard from '../../components/profile/LoyaltyPointsCard';
import ProfileSkeleton from '../../components/profile/ProfileSkeleton';

const AVATAR_SIZE = 132;

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function ProfileScreen() {
  const { userProfile, currentUser } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const pageOpacity = useSharedValue(0);
  const avatarScale = useSharedValue(1);
  const avatarOpacity = useSharedValue(0);

  const fallbackProfile = useCallback(() => {
    const name =
      (userProfile?.fullName ||
        `${userProfile?.firstName ?? ''} ${userProfile?.lastName ?? ''}`.trim() ||
        userProfile?.email ||
        currentUser?.email ||
        'User') ?? 'User';

    const phone = userProfile?.mobileNumber ?? '';
    const loyaltyPoints = Number((userProfile as any)?.loyaltyPoints ?? 0);
    const localAvatarUri = (userProfile as any)?.avatarUri ?? null;

    return { name, phone, loyaltyPoints, avatarUri: localAvatarUri };
  }, [currentUser?.email, userProfile]);

  const loadProfile = useCallback(async () => {
    const uid = currentUser?.id;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserProfile();
      setProfile(data);
      const persisted = uid ? await getSavedProfileAvatar(uid) : null;
      setAvatarUri(persisted ?? data.avatarUri ?? null);
    } catch (e) {
      const local = fallbackProfile();
      if (local && local.name !== 'User') {
        setProfile(local as UserProfile);
        const persisted = uid ? await getSavedProfileAvatar(uid) : null;
        setAvatarUri(persisted ?? local.avatarUri ?? null);
      } else {
        setError('Could not load profile. Pull to retry.');
      }
    } finally {
      setLoading(false);
    }
  }, [fallbackProfile, currentUser?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!loading) {
      pageOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
      avatarOpacity.value = withDelay(150, withTiming(1, { duration: 350 }));
    }
  }, [loading]);

  const pageStyle = useAnimatedStyle(() => ({
    opacity: pageOpacity.value,
  }));

  const avatarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }],
    opacity: avatarOpacity.value,
  }));

  const handleAvatarPressIn = () => {
    avatarScale.value = withSpring(0.96);
  };

  const handleAvatarPressOut = () => {
    avatarScale.value = withSpring(1);
  };

  const handleSelectAvatar = async (uri: string) => {
    try {
      const uid = currentUser?.id;
      if (uid) {
        const saved = await saveProfileAvatarFromPicker(uid, uri);
        setAvatarUri(saved);
      } else {
        setAvatarUri(uri);
      }
    } catch {
      Alert.alert('Photo', 'Could not save this photo. Try another image.');
    }
  };

  const displayUri = avatarUri ?? profile?.avatarUri ?? null;
  const initials = profile?.name
    ? profile.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <LinearGradient
      colors={[Colors.dark.background, Colors.dark.surface, Colors.dark.background] as const}
      style={styles.container}
    >
      <ProfileHeader />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ProfileSkeleton />
        ) : error ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <Animated.View style={pageStyle}>
            <View style={styles.avatarSection}>
              <AnimatedTouchable
                style={[styles.avatarOuter, avatarAnimatedStyle]}
                onPress={() => setPickerVisible(true)}
                onPressIn={handleAvatarPressIn}
                onPressOut={handleAvatarPressOut}
                activeOpacity={1}
              >
                <View style={styles.avatarGlow}>
                  <LinearGradient
                    colors={[Colors.accent.primary + '50', Colors.accent.secondary + '30'] as const}
                    style={styles.avatarGradient}
                  >
                    {displayUri ? (
                      <Image
                        source={{ uri: displayUri }}
                        style={styles.avatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.initialsWrap}>
                        <Text style={styles.initials}>{initials}</Text>
                      </View>
                    )}
                    <View style={styles.editBadge}>
                      <Text style={styles.editIcon}>✎</Text>
                    </View>
                  </LinearGradient>
                </View>
              </AnimatedTouchable>
            </View>
            {profile && (
              <>
                <InfoCard
                  name={profile.name}
                  phone={profile.phone}
                  loyaltyPoints={profile.loyaltyPoints}
                  style={styles.infoCard}
                />
                <LoyaltyPointsCard points={profile.loyaltyPoints} style={styles.pointsCard} />
              </>
            )}
          </Animated.View>
        )}
      </ScrollView>
      <AvatarPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelectAvatar={handleSelectAvatar}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatarOuter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlow: {
    width: AVATAR_SIZE + 16,
    height: AVATAR_SIZE + 16,
    borderRadius: (AVATAR_SIZE + 16) / 2,
    padding: 8,
    ...Platform.select({
      ios: {
        shadowColor: Colors.accent.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: { elevation: 12 },
    }),
  },
  avatarGradient: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  initialsWrap: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.glass.medium,
  },
  initials: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: Typography.sizes['3xl'],
    color: Colors.dark.text,
  },
  editBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: {
    fontSize: 14,
    color: Colors.dark.text,
  },
  infoCard: {
    marginBottom: Spacing.lg,
  },
  pointsCard: {
    marginBottom: Spacing.lg,
  },
  errorWrap: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  errorText: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.base,
    color: Colors.accent.tertiary,
    textAlign: 'center',
  },
});
