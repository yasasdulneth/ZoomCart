import { StyleSheet, Dimensions } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

const { width } = Dimensions.get('window');

export const onboardingStyles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  floatingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  welcomeCard: {
    width: '100%',
    maxWidth: 400,
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 36,
    fontFamily: Typography.fonts.accentBold,
    color: Colors.dark.text,
  },
  welcomeTitle: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: Typography.sizes['3xl'],
    color: Colors.dark.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  welcomeSubtitle: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.lg,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  },
  buttonGroup: {
    width: '100%',
    gap: Spacing.md,
  },
  formCard: {
    width: '100%',
    maxWidth: 400,
    padding: Spacing.xl,
  },
  formTitle: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: Typography.sizes['2xl'],
    color: Colors.dark.text,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  successCard: {
    width: '100%',
    maxWidth: 340,
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  successIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 48,
    color: Colors.dark.text,
  },
  successTitle: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: Typography.sizes['2xl'],
    color: Colors.dark.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  successSubtitle: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.base,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
});
