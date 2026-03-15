import React from 'react';
import { Stack } from 'expo-router';

export default function DashboardLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A0A0F' },
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="product-scan" />
      <Stack.Screen name="shared-cart" />
      <Stack.Screen name="payment-qr" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
