import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { I18nextProvider } from 'react-i18next';

import './lib/i18n';
import i18n from './lib/i18n';
import './types/navigation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { CartProvider } from './context/CartContext';
import { BudgetProvider } from './context/BudgetContext';
import { PersonalCartProvider } from './context/PersonalCartContext';
import { FriendProvider } from './context/FriendContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { SocketProvider } from './context/SocketContext';
import { StripeProvider } from '@stripe/stripe-react-native';

import BottomTabs from './navigation/BottomTabs';
import HomeScreen from './screens/HomeScreen';
import ProductScanScreen from './screens/ProductScanScreen';
import SharedCartSetupScreen from './screens/SharedCartSetupScreen';
import ActiveSharedSessionScreen from './screens/ActiveSharedSessionScreen';
import PersonalCartScreen from './screens/PersonalCartScreen';
import PaymentQRScreen from './screens/PaymentQRScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import StoreNavigationScreen from './screens/StoreNavigationScreen';
import BudgetLimiterScreen from './screens/BudgetLimiterScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import PaymentGatewayScreen from './screens/PaymentGatewayScreen';
import PaymentSuccessScreen from './screens/PaymentSuccessScreen';
import SessionReceiptScreen from './screens/SessionReceiptScreen';

const Stack = createNativeStackNavigator();

function AppContent() {
  const { resolvedTheme, colors } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return null;
  }
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationContainer
        theme={{
          ...DefaultTheme,
          dark: isDark,
          colors: {
            primary: colors.text,
            background: colors.background,
            card: colors.surface,
            text: colors.text,
            border: colors.textTertiary + '30',
            notification: '#6366F1',
          },
        }}
      >
        <SocketProvider>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        >
          {isAuthenticated ? (
            <>
              <Stack.Screen name="Home" component={BottomTabs} />
              <Stack.Screen name="ProductScan" component={ProductScanScreen} />
              <Stack.Screen name="SharedCart" component={SharedCartSetupScreen} />
              <Stack.Screen name="SharedCartSetup" component={SharedCartSetupScreen} />
              <Stack.Screen name="ActiveSharedSession" component={ActiveSharedSessionScreen} />
              <Stack.Screen name="PersonalCart" component={PersonalCartScreen} />
              <Stack.Screen name="PaymentGateway" component={PaymentGatewayScreen} />
              <Stack.Screen name="PaymentQR" component={PaymentQRScreen} />
              <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
              <Stack.Screen name="SessionReceipt" component={SessionReceiptScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
              <Stack.Screen name="StoreNavigation" component={StoreNavigationScreen} />
              <Stack.Screen name="BudgetLimiter" component={BudgetLimiterScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
        </Stack.Navigator>
        </SocketProvider>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <I18nextProvider i18n={i18n}>
        <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''}>
          <CartProvider>
            <BudgetProvider>
              <PersonalCartProvider>
                <FriendProvider>
                  <AuthProvider>
                    <LanguageProvider>
                      <ThemeProvider>
                        <AppContent />
                      </ThemeProvider>
                    </LanguageProvider>
                  </AuthProvider>
                </FriendProvider>
              </PersonalCartProvider>
            </BudgetProvider>
          </CartProvider>
        </StripeProvider>
      </I18nextProvider>
    </GestureHandlerRootView>
  );
}
