import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeOptional } from '../context/ThemeContext';
import { Colors, Typography, Spacing } from '../constants/theme';
import { useTranslation } from 'react-i18next';

const APP_NAME = 'ZOOMCART';
const APP_VERSION = '1.1.5';

export default function AppFooter() {
  const theme = useThemeOptional();
  const textColor = theme?.colors.textTertiary ?? Colors.dark.textTertiary;
  const { t } = useTranslation();

  return (
    <View
      style={styles.footer}
      children={[
        <Text key="appName" style={[styles.appName, { color: textColor }]} numberOfLines={1}>
          {APP_NAME}
        </Text>,
        <Text key="version" style={[styles.appVersion, { color: textColor }]}>
          {t('footer.version_lbl', { version: APP_VERSION })}
        </Text>,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontFamily: Typography.fonts.primaryMedium,
    fontSize: Typography.sizes.xs,
    letterSpacing: 0.5,
  },
  appVersion: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
    opacity: 0.85,
  },
});
