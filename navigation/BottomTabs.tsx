import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import HomeScreen from '../screens/HomeScreen';
import RecentSessionsScreen from '../screens/RecentSessionsScreen';
import NutriPalScreen from '../screens/NutriPalScreen';
import SupportScreen from '../screens/SupportScreen';
import { Colors, BorderRadius } from '../constants/theme';
import { useResolvedTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

export type BottomTabParamList = {
  HomeTab: undefined;
  RecentSessionsTab: undefined;
  NutriPalTab: undefined;
  SupportTab: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

/** Tab bar inner height; safe-area bottom is applied via `bottom` offset on the bar. */
const TAB_BAR_HEIGHT = 62;

// ─── Tab icon with spring animation ─────────────────────────────────────────

const TAB_CONFIG: Record<string, { icon: string; iconFocused: string; label: string }> = {
  HomeTab:            { icon: 'home-outline',         iconFocused: 'home',           label: 'Home' },
  RecentSessionsTab:  { icon: 'time-outline',          iconFocused: 'time',            label: 'Sessions' },
  NutriPalTab:        { icon: 'nutrition-outline',    iconFocused: 'nutrition',       label: 'NutriPal' },
  SupportTab:         { icon: 'help-circle-outline',   iconFocused: 'help-circle',     label: 'Help' },
};

function TabIcon({
  routeName,
  color,
  focused,
}: {
  routeName: string;
  color: string;
  focused: boolean;
}) {
  const scale = useSharedValue(1);
  const config = TAB_CONFIG[routeName] ?? { icon: 'ellipse-outline', iconFocused: 'ellipse', label: '' };

  React.useEffect(() => {
    if (focused) {
      scale.value = withSpring(1.18, { damping: 12, stiffness: 260 });
    } else {
      scale.value = withSpring(1, { damping: 14, stiffness: 200 });
    }
  }, [focused]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconName = (focused ? config.iconFocused : config.icon) as any;

  return (
    <View style={styles.tabIconRoot}>
      <Animated.View style={[animStyle, styles.iconSlot]}>
        <Ionicons name={iconName} size={24} color={color} />
      </Animated.View>
      <View style={styles.indicatorRow} pointerEvents="none">
        {focused ? <View style={[styles.activeIndicator, { backgroundColor: color }]} /> : null}
      </View>
    </View>
  );
}

// ─── Tab bar blur background ─────────────────────────────────────────────────

function TabBarBackground({ isDark }: { isDark: boolean }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView
        intensity={isDark ? 55 : 70}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)',
            borderRadius: BorderRadius.xl,
            backgroundColor: isDark ? 'rgba(18,18,20,0.35)' : 'rgba(255,255,255,0.35)',
          },
        ]}
      />
    </View>
  );
}

// ─── Navigator ───────────────────────────────────────────────────────────────

export default function BottomTabs() {
  const { isDark } = useResolvedTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarBottom = Math.max(insets.bottom, 10);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarItemStyle: styles.tabBarItem,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: 'transparent',
            borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            bottom: tabBarBottom,
            height: TAB_BAR_HEIGHT,
            paddingHorizontal: 4,
            paddingTop: 8,
            paddingBottom: 8,
          },
        ],
        tabBarBackground: () => <TabBarBackground isDark={isDark} />,
        tabBarActiveTintColor: Colors.accent.primary,
        tabBarInactiveTintColor: isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.30)',
        tabBarIcon: ({ color, focused }) => (
          <TabIcon routeName={route.name} color={color} focused={focused} />
        ),
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ tabBarAccessibilityLabel: t('tabs.home') }}
      />
      <Tab.Screen
        name="RecentSessionsTab"
        component={RecentSessionsScreen}
        options={{ tabBarAccessibilityLabel: t('tabs.sessions') }}
      />
      <Tab.Screen
        name="NutriPalTab"
        component={NutriPalScreen}
        options={{ tabBarAccessibilityLabel: t('tabs.nutripal') }}
      />
      <Tab.Screen
        name="SupportTab"
        component={SupportScreen}
        options={{ tabBarAccessibilityLabel: t('tabs.help') }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    borderTopWidth: 0,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: Platform.OS === 'android' ? 10 : 0,
  },
  tabBarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 0,
  },
  tabIconRoot: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  iconSlot: {
    width: 32,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorRow: {
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  activeIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
