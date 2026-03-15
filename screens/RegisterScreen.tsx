import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable } from 'react-native';
import { useResolvedTheme } from '../context/ThemeContext';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import type { RootStackParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import GlassInput from '../components/GlassInput';
import GlassButton from '../components/GlassButton';
import { AuthAmbientBackground } from '../components/auth/AuthAmbientBackground';
import { AuthFormPanel } from '../components/auth/AuthFormPanel';
import { ZoomCartLogo } from '../components/ZoomCartLogo';
import { LanguageLoginChip } from '../components/LanguageSelect';
import { useTranslation } from 'react-i18next';

const MIN_PASSWORD_LENGTH = 6;
const H_PAD = 20;

type RegisterNav = NativeStackNavigationProp<RootStackParamList, 'Register'>;

export default function RegisterScreen() {
  const { register } = useAuth();
  const navigation = useNavigation<RegisterNav>();
  const insets = useSafeAreaInsets();
  const { isDark, colors: C } = useResolvedTheme();
  const { t } = useTranslation();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localValidationError = useMemo(() => {
    if (!firstName.trim()) return t('register.err_first');
    if (!lastName.trim()) return t('register.err_last');
    if (!mobileNumber.trim()) return t('register.err_mobile');
    if (!email.trim()) return t('register.err_email');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return t('register.err_email_fmt');
    if (!password) return t('register.err_password');
    if (password.length < MIN_PASSWORD_LENGTH)
      return t('register.err_password_len', { min: MIN_PASSWORD_LENGTH });
    if (confirmPassword !== password) return t('register.err_password_match');
    return null;
  }, [firstName, lastName, mobileNumber, email, password, confirmPassword, t]);

  const canSubmit = useMemo(
    () => !localValidationError && !submitting,
    [localValidationError, submitting],
  );

  const handleRegister = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await register({ firstName, lastName, mobileNumber, email, password });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.registration_failed'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = error ?? (submitting ? null : localValidationError);

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
              {
                paddingTop: Spacing.md + 54,
                paddingBottom: insets.bottom + Spacing.xl,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back + brand row */}
            <View style={styles.topRow}>
              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate('Login');
                }}
                style={[
                  styles.backPill,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
                    borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)' },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('register.back_signin_a11y')}
                hitSlop={8}
              >
                <Text style={[styles.backText, { color: C.text }]}>{t('register.back_label')}</Text>
              </Pressable>
            </View>

            <Animated.View entering={ZoomIn.springify().damping(14).stiffness(180)} style={styles.brandWrap}>
              <View style={styles.logoCircle}>
                <ZoomCartLogo style={styles.logoImage} />
              </View>
              <Text style={[styles.brandWordmark, { color: C.text }]}>ZOOMCART</Text>
              <Text style={[styles.brandTag, { color: C.textSecondary }]}>{t('auth.brand_tagline')}</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <Text style={[styles.heroTitle, { color: C.text }]}>{t('register.hero_title')}</Text>
              <Text style={[styles.heroSub, { color: C.textSecondary }]}>{t('register.hero_sub')}</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).duration(420).springify().damping(16)}>
              <AuthFormPanel>
                <View style={styles.nameRow}>
                  <GlassInput
                    label={t('register.first_name')}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder=""
                    containerStyle={styles.halfInput}
                    returnKeyType="next"
                  />
                  <GlassInput
                    label={t('register.last_name')}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder=""
                    containerStyle={styles.halfInput}
                    returnKeyType="next"
                  />
                </View>

                <GlassInput
                  label={t('register.mobile')}
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                />

                <GlassInput
                  label={t('register.email')}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('register.email_placeholder')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                />

                <GlassInput
                  label={t('register.password')}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
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

                <GlassInput
                  label={t('register.confirm_password')}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder=""
                  secureTextEntry={!showConfirm}
                  returnKeyType="done"
                  onSubmitEditing={() => void handleRegister()}
                  rightElement={
                    <Pressable
                      onPress={() => setShowConfirm((p) => !p)}
                      accessibilityLabel={showConfirm ? t('register.hide_confirm') : t('register.show_confirm')}
                      accessibilityRole="button"
                      hitSlop={12}
                      style={styles.visibilityBtn}
                    >
                      <Ionicons
                        name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
                        color={C.textSecondary}
                      />
                    </Pressable>
                  }
                />

                {!!displayError && (
                  <Animated.View entering={FadeInDown.duration(220)} style={styles.errorBadge}>
                    <Text style={styles.errorText}>⚠ {displayError}</Text>
                  </Animated.View>
                )}

                <GlassButton
                  title={submitting ? t('register.creating') : t('register.create_btn')}
                  onPress={() => void handleRegister()}
                  variant="fill"
                  size="lg"
                  loading={submitting}
                  disabled={!canSubmit}
                  style={styles.primaryBtn}
                  accessibilityLabel={t('register.create_a11y')}
                />
              </AuthFormPanel>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).duration(380)} style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: C.textSecondary }]}>{t('register.have_account')} </Text>
              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate('Login');
                }}
                accessibilityRole="button"
                accessibilityLabel={t('register.sign_in_a11y')}
              >
                <Text style={styles.switchLink}>{t('register.sign_in_link')}</Text>
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
    paddingTop: Spacing.sm },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm },
  backPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1 },
  backText: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: 15,
    letterSpacing: -0.24 },
  brandWrap: {
    alignItems: 'center',
    marginBottom: Spacing.md },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    ...Shadows.accent,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
    backgroundColor: 'transparent' },
  logoImage: { width: '100%', height: '100%' },
  brandWordmark: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 2.5 },
  brandTag: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 11,
    letterSpacing: 1.2,
    opacity: 0.55,
    marginTop: 4 },
  heroTitle: {
    fontFamily: Typography.fonts.primaryBold,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 6 },
  heroSub: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 16,
    letterSpacing: -0.32,
    marginBottom: Spacing.lg },
  nameRow: {
    flexDirection: 'row',
    gap: Spacing.sm },
  halfInput: {
    flex: 1 },
  visibilityBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    minHeight: 36 },
  errorBadge: {
    backgroundColor: 'rgba(255,59,48,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.28)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md },
  errorText: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 13,
    color: Colors.accent.red,
    letterSpacing: -0.08 },
  primaryBtn: { width: '100%', marginTop: Spacing.xs },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: Spacing.lg },
  switchLabel: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 15,
    letterSpacing: -0.24 },
  switchLink: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: 15,
    color: Colors.accent.primary,
    letterSpacing: -0.24 } });
