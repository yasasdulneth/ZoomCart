import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useResolvedTheme } from '../../context/ThemeContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence } from 'react-native-reanimated';
import { Typography, Spacing, BorderRadius } from '../../constants/theme';
import type { SyncStatus } from '../../lib/sharedCart/types';

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: number | null;
}

interface SyncStatusBadgeProps {
  syncState: SyncState;
}

const STATUS_CONFIG: Record<
  SyncStatus,
  { label: string; emoji: string; color: string }
> = {
  synced: { label: 'Synced', emoji: '🟢', color: '#22C55E' },
  syncing: { label: 'Syncing...', emoji: '🟡', color: '#EAB308' },
  offline: { label: 'Offline', emoji: '🔴', color: '#EF4444' } };

export default function SyncStatusBadge({ syncState }: SyncStatusBadgeProps) {
  const { isDark, colors: C } = useResolvedTheme();

  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = 0;
    opacity.value = withTiming(1, { duration: 250 });
    scale.value = withSequence(
      withTiming(1.05, { duration: 100 }),
      withTiming(1, { duration: 150 })
    );
  }, [syncState.status]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }] }));

  const config = STATUS_CONFIG[syncState.status];

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
          borderColor: C.borderSubtle },
        animatedStyle,
      ]}
    >
      <Text style={styles.emoji}>{config.emoji}</Text>
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 4 },
  emoji: {
    fontSize: 10 },
  label: {
    fontFamily: Typography.fonts.secondaryMedium,
    fontSize: Typography.sizes.xs } });
