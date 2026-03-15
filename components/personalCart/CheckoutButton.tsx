import React from 'react';
import { StyleSheet } from 'react-native';
import GlassButton from '../GlassButton';
import { Spacing } from '../../constants/theme';
import { useTranslation } from 'react-i18next';

interface CheckoutButtonProps {
  disabled?: boolean;
  onPress: () => void;
}

export default function CheckoutButton({ disabled, onPress }: CheckoutButtonProps) {
  const { t } = useTranslation();
  return (
    <GlassButton
      title={t('checkout.proceed')}
      onPress={onPress}
      size="lg"
      variant="fill"
      disabled={disabled}
      style={styles.button}
      accessibilityLabel={t('checkout.proceed_a11y')}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    marginBottom: Spacing['2xl'],
    width: '100%',
  },
});
