/**
 * Expo Router entry for /scan. Re-exports ScanScreenContent and default with useRouter.
 * For React Navigation, import ScanScreenContent from './ScanScreenContent' to avoid loading expo-router.
 */
import React from 'react';
import { useRouter } from 'expo-router';
import { ScanScreenContent } from './ScanScreenContent';

export { ScanScreenContent } from './ScanScreenContent';
export type { ScanScreenContentProps } from './ScanScreenContent';

export default function ScanScreen() {
  const router = useRouter();
  return <ScanScreenContent onBack={() => router.back()} />;
}
