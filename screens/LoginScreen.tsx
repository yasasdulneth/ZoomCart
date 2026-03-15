import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useResolvedTheme } from '../context/ThemeContext';
import type { RootStackParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import GlassInput from '../components/GlassInput';
import GlassButton from '../components/GlassButton';
import { AuthAmbientBackground } from '../components/auth/AuthAmbientBackground';
import { AuthFormPanel } from '../components/auth/AuthFormPanel';
import { ZoomCartLogo } from '../components/ZoomCartLogo';
import { LanguageLoginChip } from '../components/LanguageSelect';
import { useTranslation } from 'react-i18next';

const H_PAD = 20;

type LoginNav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const { login } = useAuth();
  const navigation = useNavigation<LoginNav>();
  const insets = useSafeAreaInsets();
  const { isDark, colors: C } = useResolvedTheme();
  const { t } = useTranslation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => identifier.trim().length > 0 && password.length > 0 && !submitting,
    [identifier, password, submitting],
  );

  const handleLogin = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await login(identifier, password);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <AuthAmbientBackground isDark={isDark} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              { paddingTop: Spacing.md + 54, paddingBottom: insets.bottom + Spacing.xl },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Brand — matches Home header tone */}
            <Animated.View entering={ZoomIn.springify().damping(14).stiffness(180)} style={styles.brandWrap}>
              <View style={styles.logoCircle}>
                <ZoomCartLogo style={styles.logoImage} />
              </View>
              <Text style={[styles.brandWordmark, { color: C.text }]}>ZOOMCART</Text>
              <Text style={[styles.brandTag, { color: C.textSecondary }]}>{t('auth.brand_tagline')}</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(120).duration(400)}>
              <Text style={[styles.heroTitle, { color: C.text }]}>{t('auth.login_welcome')}</Text>
              <Text style={[styles.heroSub, { color: C.textSecondary }]}>
                {t('auth.login_sub')}
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(220).duration(420).springify().damping(16)}>
              <AuthFormPanel>
                <GlassInput
                  label={t('auth.email_or_mobile')}
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder=""
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                />

                <GlassInput
                  label={t('auth.password')}
                  value={password}
                  onChangeText={setPassword}
                  placeholder=""
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={() => void handleLogin()}
                  rightElement={
                    <Pressable
                      onPress={() => setShowPassword((p) => !p)}
                      accessibilityLabel={showPassword ? t('auth.hide_password') : t('auth.show_password')}
                      accessibilityRole="button"
                      hitSlop={12}
                      style={styles.visibilityBtn}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
                        color={C.textSecondary}
                      />
                    </Pressable>
                  }
                />

                {!!error && (
                  <Animated.View entering={FadeInDown.duration(220)} style={styles.errorBadge}>
                    <Text style={styles.errorText}>⚠ {error}</Text>
                  </Animated.View>
                )}

                <GlassButton
                  title={submitting ? t('auth.signing_in') : t('auth.sign_in')}
                  onPress={() => void handleLogin()}
                  variant="fill"
                  size="lg"
                  loading={submitting}
                  disabled={!canSubmit}
                  style={styles.primaryBtn}
                  accessibilityLabel={t('auth.sign_in_a11y')}
                />
              </AuthFormPanel>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(320).duration(380)} style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: C.textSecondary }]}>
                {t('auth.no_account')}{' '}
              </Text>
              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate('Register');
                }}
                accessibilityRole="button"
                accessibilityLabel={t('auth.create_account_a11y')}
              >
                <Text style={styles.switchLink}>{t('auth.create_account')}</Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
        <LanguageLoginChip edgePadding={H_PAD} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: H_PAD,
  },
  brandWrap: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    marginTop: Spacing.md,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.accent,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  logoImage: { width: '100%', height: '100%' },
  brandWordmark: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 2.5,
  },
  brandTag: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 11,
    letterSpacing: 1.2,
    opacity: 0.55,
    marginTop: 4,
  },
  heroTitle: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroSub: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 16,
    letterSpacing: -0.32,
    marginBottom: Spacing.lg,
  },
  visibilityBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    minHeight: 36,
  },
  errorBadge: {
    backgroundColor: 'rgba(255,59,48,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.28)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 13,
    color: Colors.accent.red,
    letterSpacing: -0.08,
  },
  primaryBtn: { width: '100%', marginTop: Spacing.xs },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: Spacing.lg,
  },
  switchLabel: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 15,
    letterSpacing: -0.24,
  },
  switchLink: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: 15,
    color: Colors.accent.primary,
    letterSpacing: -0.24,
  },
});
