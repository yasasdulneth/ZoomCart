import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScanScreenContent } from '../app/scan/ScanScreenContent';
import AppFooter from '../components/AppFooter';
import { Typography, Spacing, DarkColors, LightColors } from '../constants/theme';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';
import { useTheme } from '../context/ThemeContext';
import GlassButton from '../components/GlassButton';
import { useTranslation } from 'react-i18next';

interface Props {
  children: ReactNode;
  onBack?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ScanErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Scan screen error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ScanErrorFallback onBack={this.props.onBack} />;
    }
    return this.props.children;
  }
}

function ScanErrorFallback({ onBack }: { onBack?: () => void }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const C = isDark ? DarkColors : LightColors;
  const { t } = useTranslation();

  return (
    <View style={[fallbackStyles.container, { backgroundColor: C.background }]}>
      <Text style={[fallbackStyles.title, { color: C.text }]}>{t('scanFallback.cam_title')}</Text>
      <Text style={[fallbackStyles.message, { color: C.textSecondary }]}>{t('scanFallback.cam_message')}</Text>
      <GlassButton title={t('scanFallback.back_home')} onPress={() => onBack?.()} variant="fill" size="lg" />
    </View>
  );
}

const fallbackStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  title: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: Typography.sizes.xl,
    textAlign: 'center',
  },
  message: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.base,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
});

export default function ProductScanScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'ProductScan'>>();
  const closeAfterAdd = Boolean(route.params?.closeAfterAdd);
  const sharedSessionId = route.params?.sharedSessionId;

  return (
    <ScanErrorBoundary onBack={() => navigation.goBack()}>
      <View style={screenStyles.screenWrap}>
        <ScanScreenContent
          onBack={() => navigation.goBack()}
          closeAfterAdd={closeAfterAdd}
          sharedSessionId={sharedSessionId}
        />
        <AppFooter />
      </View>
    </ScanErrorBoundary>
  );
}

const screenStyles = StyleSheet.create({
  screenWrap: {
    flex: 1,
  },
});
