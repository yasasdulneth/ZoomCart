import React from 'react';
import { View, Text, TextInput, StyleSheet, ViewStyle } from 'react-native';
import { useResolvedTheme } from '../../context/ThemeContext';
import GlassCard from '../GlassCard';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useTranslation } from 'react-i18next';

interface InfoCardProps {
  name: string;
  phone: string;
  loyaltyPoints: number;
  editable?: boolean;
  onNameChange?: (value: string) => void;
  onPhoneChange?: (value: string) => void;
  style?: ViewStyle;
}

export default function InfoCard({
  name,
  phone,
  loyaltyPoints,
  editable = false,
  onNameChange,
  onPhoneChange,
  style }: InfoCardProps) {
  const { isDark, colors: C } = useResolvedTheme();
  const { t } = useTranslation();

  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const dividerColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
  const pillText = '#FFFFFF';

  return (
    <GlassCard style={StyleSheet.flatten([styles.card, style])} padding={Spacing.lg}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: C.textSecondary }]}>{t('infoCard.name')}</Text>
        {editable && onNameChange ? (
          <TextInput
            style={[styles.input, { color: C.text, backgroundColor: inputBg }]}
            value={name}
            onChangeText={onNameChange}
            placeholder={t('infoCard.ph_name')}
            placeholderTextColor={C.textTertiary}
          />
        ) : (
          <Text style={[styles.value, { color: C.text }]}>{name}</Text>
        )}
      </View>
      <View style={[styles.divider, { backgroundColor: dividerColor }]} />
      <View style={styles.row}>
        <Text style={[styles.label, { color: C.textSecondary }]}>{t('infoCard.phone')}</Text>
        {editable && onPhoneChange ? (
          <TextInput
            style={[styles.input, { color: C.text, backgroundColor: inputBg }]}
            value={phone}
            onChangeText={onPhoneChange}
            placeholder={t('infoCard.ph_phone')}
            placeholderTextColor={C.textTertiary}
            keyboardType="phone-pad"
          />
        ) : (
          <Text style={[styles.value, { color: C.text }]}>{phone}</Text>
        )}
      </View>
      <View style={[styles.divider, { backgroundColor: dividerColor }]} />
      <View style={styles.row}>
        <Text style={[styles.label, { color: C.textSecondary }]}>{t('infoCard.zoompoints')}</Text>
        <View style={styles.pointsChip}>
          <Text style={[styles.pointsText, { color: pillText }]}>{loyaltyPoints.toLocaleString()}</Text>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: BorderRadius.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm },
  label: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.base },
  value: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: Spacing.md },
  input: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.base,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    minWidth: 140,
    textAlign: 'right' },
  divider: {
    height: 1,
    marginVertical: Spacing.xs },
  pointsChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 1,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accent.primary },
  pointsText: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: Typography.sizes.base } });
