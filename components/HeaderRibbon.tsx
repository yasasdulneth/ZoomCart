import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius, BlurIntensity } from '../constants/theme';
import { useThemeOptional } from '../context/ThemeContext';

const PROFILE_SIZE = 44;
const HEADER_HEIGHT = 56;
const BORDER_RADIUS_BOTTOM = 22;

interface HeaderRibbonProps {
  profileImageUri?: string | null;
  userInitials?: string;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const SETTINGS_SIZE = 44;

export default function HeaderRibbon({
  profileImageUri = null,
  userInitials = 'U',
}: HeaderRibbonProps) {
  const navigation = useNavigation();
  const theme = useThemeOptional();
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-16);
  const profileScale = useSharedValue(1);
  const settingsScale = useSharedValue(1);

  const textColor = theme?.colors.text ?? Colors.dark.text;
  const textSecondary = theme?.colors.textSecondary ?? Colors.dark.textSecondary;

  useEffect(() => {
    headerOpacity.value = withDelay(80, withTiming(1, { duration: 400 }));
    headerTranslateY.value = withDelay(80, withSpring(0, { damping: 20 }));
  }, []);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const profileAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: profileScale.value }],
  }));

  const settingsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: settingsScale.value }],
  }));

  const handleProfilePress = () => {
    /**
     * HeaderRibbon is used inside tab screens (BottomTabs), but `Profile` lives
     * in the parent Stack navigator (see `App.tsx`). Use the parent navigator
     * when available so the route resolves correctly.
     */
    const parentNav = (navigation as any)?.getParent?.();
    (parentNav ?? navigation).navigate('Profile');
  };

  const handleProfilePressIn = () => {
    profileScale.value = withSpring(0.95);
  };

  const handleProfilePressOut = () => {
    profileScale.value = withSpring(1);
  };

  const handleSettingsPress = () => {
    const parentNav = (navigation as any)?.getParent?.();
    (parentNav ?? navigation).navigate('Settings');
  };
  const handleSettingsPressIn = () => {
    settingsScale.value = withSpring(0.95);
  };
  const handleSettingsPressOut = () => {
    settingsScale.value = withSpring(1);
  };

  return (
    <Animated.View style={[styles.outer, headerAnimatedStyle]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <BlurView intensity={BlurIntensity.medium} tint="dark" style={styles.blur}>
          <LinearGradient
            colors={[Colors.glass.light, Colors.glass.dark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <View style={styles.row}>
              <AnimatedTouchable
                style={[styles.profileWrap, profileAnimatedStyle]}
                onPress={handleProfilePress}
                onPressIn={handleProfilePressIn}
                onPressOut={handleProfilePressOut}
                activeOpacity={1}
              >
                {profileImageUri ? (
                  <Image
                    source={{ uri: profileImageUri }}
                    style={styles.profileImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.initialsWrap}>
                    <Text style={styles.initials}>{userInitials}</Text>
                  </View>
                )}
              </AnimatedTouchable>
              <View style={styles.center}>
                <Text style={[styles.logoTitle, { color: textColor }]} numberOfLines={1}>
                  ZOOMCART
                </Text>
                <Text style={[styles.logoSubtitle, { color: textSecondary }]} numberOfLines={1}>
                  Smart Way to Shop
                </Text>
              </View>
              <AnimatedTouchable
                style={[styles.settingsWrap, settingsAnimatedStyle]}
                onPress={handleSettingsPress}
                onPressIn={handleSettingsPressIn}
                onPressOut={handleSettingsPressOut}
                activeOpacity={1}
              >
                <Text style={styles.settingsIcon}>⚙️</Text>
              </AnimatedTouchable>
            </View>
          </LinearGradient>
        </BlurView>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginBottom: Spacing.md,
  },
  safeArea: {
    backgroundColor: 'transparent',
  },
  blur: {
    borderBottomLeftRadius: BORDER_RADIUS_BOTTOM,
    borderBottomRightRadius: BORDER_RADIUS_BOTTOM,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    ...Platform.select({
      ios: {
        shadowColor: Colors.accent.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  gradient: {
    minHeight: HEADER_HEIGHT,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsWrap: {
    width: SETTINGS_SIZE,
    height: SETTINGS_SIZE,
    borderRadius: SETTINGS_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.glass.medium,
  },
  settingsIcon: {
    fontSize: 22,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  logoTitle: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: Typography.sizes.xl,
    letterSpacing: 1.2,
  },
  logoSubtitle: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  profileWrap: {
    width: PROFILE_SIZE,
    height: PROFILE_SIZE,
    borderRadius: PROFILE_SIZE / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    overflow: 'hidden',
    backgroundColor: Colors.glass.medium,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  initialsWrap: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent.primary + '40',
  },
  initials: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
    color: Colors.dark.text,
  },
});
