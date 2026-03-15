import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import { LANGUAGE_OPTIONS, type AppLocale } from '../constants/languages';
import { useAppLanguage } from '../context/LanguageContext';
import { useResolvedTheme } from '../context/ThemeContext';

export function LanguageSelectModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isDark, colors: C } = useResolvedTheme();
  const { t } = useTranslation();
  const { language, setLanguage } = useAppLanguage();

  const sheetMaxH = Math.min(height * 0.72, 520);

  const pick = async (code: AppLocale) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setLanguage(code);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('settings.language_modal_close_a11y')} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: C.surface,
              borderColor: C.border,
              paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.md,
              maxHeight: sheetMaxH,
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: C.text }]}>{t('settings.language_select_title')}</Text>
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                onClose();
              }}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('settings.language_modal_close_a11y')}
            >
              <Ionicons name="close-circle-outline" size={28} color={C.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetScroll}
          >
            {LANGUAGE_OPTIONS.map((opt) => {
              const selected = language === opt.code;
              return (
                <Pressable
                  key={opt.code}
                  onPress={() => void pick(opt.code)}
                  style={({ pressed }) => [
                    styles.optionRow,
                    {
                      backgroundColor: selected
                        ? Colors.accent.primary + (isDark ? '22' : '18')
                        : 'transparent',
                      borderColor: selected ? Colors.accent.primary + '55' : C.border,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${opt.nativeLabel}. ${opt.label}`}
                >
                  <View style={[styles.optionIconWrap, { backgroundColor: C.background }]}>
                    <Ionicons
                      name="language-outline"
                      size={20}
                      color={selected ? Colors.accent.primary : C.textSecondary}
                    />
                  </View>
                  <View style={styles.optionTextCol}>
                    <Text style={[styles.optionTitle, { color: C.text }]}>{opt.nativeLabel}</Text>
                    <Text style={[styles.optionSub, { color: C.textSecondary }]}>{opt.label}</Text>
                  </View>
                  {selected ? (
                    <Ionicons name="checkmark-circle" size={22} color={Colors.accent.primary} />
                  ) : (
                    <View style={[styles.radioOuter, { borderColor: C.textTertiary + '55' }]} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** Single settings-style row that opens the language modal (use inside `GlassCard`). */
export function LanguageSettingsRow() {
  const [visible, setVisible] = useState(false);
  const { language } = useAppLanguage();
  const { isDark, colors: C } = useResolvedTheme();
  const { t } = useTranslation();

  const current = useMemo(
    () => LANGUAGE_OPTIONS.find((o) => o.code === language) ?? LANGUAGE_OPTIONS[0],
    [language],
  );

  return (
    <>
      <Pressable
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setVisible(true);
        }}
        style={({ pressed }) => [
          styles.themeRow,
          {
            backgroundColor: 'transparent',
            borderColor: C.border,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${t('settings.language')}. ${current.nativeLabel}`}
      >
        <View style={[styles.themeIconWrap, { backgroundColor: C.surface + '99' }]}>
          <Ionicons name="language-outline" size={22} color={Colors.accent.primary} />
        </View>
        <View style={styles.themeTextCol}>
          <Text style={[styles.themeTitle, { color: C.text }]}>{t('settings.language')}</Text>
          <Text style={[styles.themeDesc, { color: C.textSecondary }]}>{current.nativeLabel}</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={C.textSecondary} />
      </Pressable>
      <LanguageSelectModal visible={visible} onClose={() => setVisible(false)} />
    </>
  );
}

/** Compact control for auth screens (top corner). */
export function LanguageLoginChip({ edgePadding = 20 }: { edgePadding?: number }) {
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const { language } = useAppLanguage();
  const { isDark, colors: C } = useResolvedTheme();
  const { t } = useTranslation();

  const current = useMemo(
    () => LANGUAGE_OPTIONS.find((o) => o.code === language) ?? LANGUAGE_OPTIONS[0],
    [language],
  );

  return (
    <>
      <View
        style={[
          styles.loginChipWrap,
          {
            right: edgePadding,
            top: insets.top + Spacing.sm + 6,
          },
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setVisible(true);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          style={({ pressed }) => [
            styles.loginChip,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
              borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
              opacity: pressed ? 0.88 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('auth.language_button_a11y')}
          accessibilityHint={current.nativeLabel}
        >
          <Ionicons name="globe-outline" size={18} color={Colors.accent.primary} />
          <Text style={[styles.loginChipLabel, { color: C.text }]} numberOfLines={1}>
            {current.nativeLabel}
          </Text>
          <Ionicons name="chevron-down" size={16} color={C.textSecondary} />
        </Pressable>
      </View>
      <LanguageSelectModal visible={visible} onClose={() => setVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sheetTitle: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    letterSpacing: -0.3,
    flex: 1,
    paddingRight: Spacing.sm,
  },
  sheetScroll: {
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  optionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextCol: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
  },
  optionSub: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  themeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeTextCol: {
    flex: 1,
    gap: 2,
  },
  themeTitle: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
  },
  themeDesc: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
  },
  loginChipWrap: {
    position: 'absolute',
    zIndex: 100,
    elevation: 28,
    maxWidth: '52%',
  },
  loginChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  loginChipLabel: {
    flexShrink: 1,
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: 13,
    fontWeight: '600',
  },
});
