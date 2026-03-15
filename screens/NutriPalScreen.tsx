import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import GlassCard from '../components/GlassCard';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
} from '../constants/theme';
import { useResolvedTheme } from '../context/ThemeContext';
import { sendNutriPalMessage, isNutriPalConfigured } from '../lib/services/nutripalDeepseek.service';
import { useTranslation } from 'react-i18next';

type Bubble = { id: string; role: 'user' | 'assistant'; text: string };

function uid() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export default function NutriPalScreen() {
  const { isDark, colors: C } = useResolvedTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { t, i18n } = useTranslation();
  /** Space above the floating tab bar + home indicator */
  const bottomChrome = tabBarHeight + insets.bottom;

  const [messages, setMessages] = useState<Bubble[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setMessages((prev) => {
      const rest = prev.filter((m) => m.id !== 'welcome');
      return [{ id: 'welcome', role: 'assistant', text: t('nutripal.welcome') }, ...rest];
    });
  }, [t, i18n.language]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    if (!isNutriPalConfigured()) {
      Alert.alert(t('nutripal.unavailable_title'), t('nutripal.unavailable_body'));
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const userId = uid();
    setInput('');
    setMessages((prev) => [...prev, { id: userId, role: 'user', text }]);
    setSending(true);

    try {
      const prior = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.text }));
      const reply = await sendNutriPalMessage(prior, text);
      setMessages((prev) => [...prev, { id: uid(), role: 'assistant', text: reply }]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('nutripal.alert_title'), e instanceof Error ? e.message : t('nutripal.send_failed_generic'));
      setMessages((prev) => prev.filter((m) => m.id !== userId));
      setInput(text);
    } finally {
      setSending(false);
    }
  }, [input, sending, messages, t]);

  const bgColors = isDark
    ? (['#0A0A0F', '#0D1117', '#0A0E1A'] as const)
    : (['#EEF2FF', '#F5F0FF', '#EFF6FF'] as const);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: C.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

        <View style={[styles.header, { paddingHorizontal: Spacing.lg }]}>
          <Text style={[styles.kicker, { color: C.textSecondary }]}>{t('nutripal.header_kicker')}</Text>
          <Text style={[styles.title, { color: C.text }]}>{t('nutripal.title')}</Text>
          <Text style={[styles.subtitle, { color: C.textSecondary }]}>{t('nutripal.subtitle')}</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Spacing.md },
          ]}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((m) => (
            <View
              key={m.id}
              style={[
                styles.bubbleRow,
                m.role === 'user' ? styles.bubbleRowUser : styles.bubbleRowAssistant,
              ]}
            >
              <GlassCard
                style={[
                  styles.bubble,
                  m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                  {
                    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                  },
                ]}
                padding={Spacing.md}
              >
                <Text style={[styles.bubbleText, { color: C.text }]}>{m.text}</Text>
              </GlassCard>
            </View>
          ))}
          {sending ? (
            <View style={[styles.bubbleRow, styles.bubbleRowAssistant]}>
              <View style={[styles.typing, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                <ActivityIndicator size="small" color={Colors.accent.primary} />
                <Text style={[styles.typingText, { color: C.textSecondary }]}>{t('nutripal.typing')}</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.inputBar,
            {
              paddingBottom: bottomChrome + Spacing.xs,
              borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              backgroundColor: isDark ? 'rgba(18,18,22,0.92)' : 'rgba(255,255,255,0.94)',
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                color: C.text,
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
              },
            ]}
            placeholder={t('nutripal.placeholder_input')}
            placeholderTextColor={C.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
            editable={!sending}
            onSubmitEditing={() => void handleSend()}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <Pressable
            onPress={() => void handleSend()}
            disabled={sending || !input.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: Colors.accent.primary,
                opacity: pressed ? 0.88 : sending || !input.trim() ? 0.45 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('nutripal.send_a11y')}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  kicker: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontFamily: Typography.fonts.accentBold,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  bubbleRow: {
    width: '100%',
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubbleRowAssistant: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '88%',
    flexShrink: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
  },
  bubbleUser: {
    borderTopRightRadius: 4,
  },
  bubbleAssistant: {
    borderTopLeftRadius: 4,
  },
  bubbleText: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 15,
    lineHeight: 22,
  },
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
  },
  typingText: {
    fontFamily: Typography.fonts.secondary,
    fontSize: 13,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontFamily: Typography.fonts.secondary,
    fontSize: 16,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    alignSelf: 'flex-end',
  },
});
