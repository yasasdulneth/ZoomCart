import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Alert } from 'react-native';
import { useResolvedTheme } from '../../context/ThemeContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius, BlurIntensity } from '../../constants/theme';
import type { Friend } from '../../context/FriendContext';

interface FriendListItemProps {
  friend: Friend;
  selected: boolean;
  onToggle: () => void;
  onDelete?: () => void;
}

export default function FriendListItem({ friend, selected, onToggle, onDelete }: FriendListItemProps) {
  const [deleting, setDeleting] = useState(false);
  const { isDark, colors: C } = useResolvedTheme();
  const blurTint = isDark ? 'dark' : 'light';
  const unselectedGradient = isDark
    ? ([Colors.glass.light, Colors.glass.dark] as const)
    : (['rgba(255,255,255,0.94)', 'rgba(245,245,250,0.92)'] as const);

  const handleDelete = () => {
    Alert.alert(
      'Remove Friend',
      `Remove ${friend.name} from your friends list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setDeleting(true);
            onDelete?.();
          } },
      ],
    );
  };

  return (
    <View style={[styles.wrapper, deleting && styles.wrapperDeleting]}>
      <Animated.View entering={FadeInRight.duration(220)}>
        <Pressable
          onPress={onToggle}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
        <BlurView intensity={BlurIntensity.medium} tint={blurTint} style={styles.blur}>
          <LinearGradient
            colors={
              selected
                ? [Colors.accent.primary + 'E6', Colors.accent.secondary + 'CC']
                : unselectedGradient
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.card,
              { borderColor: selected ? 'rgba(255,255,255,0.28)' : C.borderSubtle },
              selected && styles.cardSelected,
            ]}
          >
            <View style={styles.left}>
              {friend.avatar ? (
                <Image source={{ uri: friend.avatar }} style={styles.avatar} />
              ) : (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    { backgroundColor: isDark ? Colors.glass.medium : 'rgba(0,0,0,0.06)' },
                    selected && styles.avatarPlaceholderSelected,
                  ]}
                >
                  <Text style={styles.avatarEmoji}>👤</Text>
                </View>
              )}
              <View style={styles.info}>
                <Text style={[styles.name, { color: selected ? '#FFFFFF' : C.text }]}>{friend.name}</Text>
                {friend.phone ? (
                  <Text style={[styles.phone, { color: selected ? 'rgba(255,255,255,0.88)' : C.textSecondary }]}>
                    {friend.phone}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.right}>
              {selected ? <Text key="friend-selected-tick" style={styles.checkboxTick}>✓</Text> : null}
              {onDelete ? (
                <Pressable
                  key="friend-delete"
                  style={({ pressed }) => [styles.deleteBtn, pressed && styles.deleteBtnPressed]}
                  onPress={handleDelete}
                  hitSlop={8}
                >
                  <Text style={styles.deleteIcon}>🗑</Text>
                </Pressable>
              ) : null}
            </View>
          </LinearGradient>
        </BlurView>
      </Pressable>
      </Animated.View>
    </View>
  );
}

const AVATAR_SIZE = 40;

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.sm },
  wrapperDeleting: {
    opacity: 0.4 },
  pressed: {
    opacity: 0.9 },
  blur: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden' },
  card: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1 },
  cardSelected: {
    borderColor: 'rgba(255,255,255,0.25)' },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1 },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    marginRight: Spacing.md },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md },
  avatarPlaceholderSelected: {
    backgroundColor: 'rgba(255,255,255,0.25)' },
  avatarEmoji: {
    fontSize: 20 },
  info: {
    flex: 1 },
  name: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
    marginBottom: 2 },
  phone: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm },
  checkboxTick: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
    color: '#FFFFFF' },
  deleteBtn: {
    padding: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(249,115,115,0.15)' },
  deleteBtnPressed: {
    backgroundColor: 'rgba(249,115,115,0.35)' },
  deleteIcon: {
    fontSize: 15 } });

