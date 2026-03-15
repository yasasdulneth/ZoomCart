import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CartProvider } from '../context/CartContext';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { BudgetProvider } from '../context/BudgetContext';
import { PersonalCartProvider } from '../context/PersonalCartContext';
import { FriendProvider } from '../context/FriendContext';
import { StripeProvider } from '@stripe/stripe-react-native';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''}>
        <AuthProvider>
          <ThemeProvider>
            <CartProvider>
              <BudgetProvider>
                <PersonalCartProvider>
                  <FriendProvider>
                    <StatusBar style="light" />
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        contentStyle: styles.stackContent,
                        animation: 'slide_from_right',
                      }}
                    >
                      <Stack.Screen name="index" />
                      <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
                      <Stack.Screen
                        name="dashboard"
                        options={{
                          animation: 'fade',
                          gestureEnabled: false,
                        }}
                      />
                    </Stack>
                  </FriendProvider>
                </PersonalCartProvider>
              </BudgetProvider>
            </CartProvider>
          </ThemeProvider>
        </AuthProvider>
      </StripeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stackContent: { backgroundColor: '#0A0A0F' },
});
