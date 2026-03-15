import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const STORAGE_PREFIX = 'zoomcart.profileAvatar.uri.';

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function safeUserId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'user';
}

function destPath(userId: string): string {
  const base = FileSystem.documentDirectory;
  if (!base) return '';
  return `${base}profile_avatar_${safeUserId(userId)}.jpg`;
}

function isRemoteUri(uri: string): boolean {
  return /^https?:\/\//i.test(uri);
}

/**
 * Persists a chosen avatar: copies local gallery/files URIs into app storage so they survive restarts.
 * Remote URLs (e.g. stock avatars) are stored as-is.
 */
export async function saveProfileAvatarFromPicker(userId: string, pickedUri: string): Promise<string> {
  const trimmed = pickedUri.trim();
  if (!trimmed) throw new Error('Empty image');

  if (isRemoteUri(trimmed)) {
    await AsyncStorage.setItem(storageKey(userId), trimmed);
    return trimmed;
  }

  const dest = destPath(userId);
  if (!dest) {
    await AsyncStorage.setItem(storageKey(userId), trimmed);
    return trimmed;
  }

  await FileSystem.copyAsync({ from: trimmed, to: dest });
  await AsyncStorage.setItem(storageKey(userId), dest);
  return dest;
}

/** Returns saved URI if still valid (file exists for local paths). */
export async function getSavedProfileAvatar(userId: string): Promise<string | null> {
  const uri = await AsyncStorage.getItem(storageKey(userId));
  if (!uri?.trim()) return null;

  if (isRemoteUri(uri)) return uri;

  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      await AsyncStorage.removeItem(storageKey(userId));
      return null;
    }
    return uri;
  } catch {
    await AsyncStorage.removeItem(storageKey(userId));
    return null;
  }
}

export async function clearSavedProfileAvatar(userId: string): Promise<void> {
  const uri = await AsyncStorage.getItem(storageKey(userId));
  if (uri && !isRemoteUri(uri)) {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      // ignore
    }
  }
  await AsyncStorage.removeItem(storageKey(userId));
}
