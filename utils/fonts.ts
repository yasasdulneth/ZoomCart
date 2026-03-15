import { Typography } from '../constants/theme';

export const getFontFamily = (
  base: 'primary' | 'secondary' | 'accent',
  weight: 'regular' | 'medium' | 'semibold' | 'bold' = 'regular'
): string => {
  const fontMap: Record<string, Record<string, string>> = {
    primary: {
      regular: Typography.fonts.primary,
      medium: Typography.fonts.primaryMedium,
      semibold: Typography.fonts.primarySemiBold,
      bold: Typography.fonts.primaryBold,
    },
    secondary: {
      regular: Typography.fonts.secondary,
      medium: Typography.fonts.secondaryMedium,
      semibold: Typography.fonts.secondaryMedium, // Fallback
      bold: Typography.fonts.secondaryMedium, // Fallback
    },
    accent: {
      regular: Typography.fonts.accent,
      medium: Typography.fonts.accent,
      semibold: Typography.fonts.accent,
      bold: Typography.fonts.accentBold,
    },
  };

  return fontMap[base]?.[weight] || Typography.fonts.primary;
};
