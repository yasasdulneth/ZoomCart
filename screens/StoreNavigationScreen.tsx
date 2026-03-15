import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useResolvedTheme } from '../context/ThemeContext';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { fetchAisles, fetchProductLocation } from '../lib/api/store';
import type { Aisle, ProductLocationResponse } from '../lib/api/store';
import { Typography, Spacing } from '../constants/theme';
import SharedCartHeader from '../components/sharedCart/SharedCartHeader';
import SearchBar from '../components/storeNavigation/SearchBar';
import AisleCard from '../components/storeNavigation/AisleCard';
import ExpandableAisleSection from '../components/storeNavigation/ExpandableAisleSection';
import GuidanceStepsCard from '../components/storeNavigation/GuidanceStepsCard';
import ProductFoundCard from '../components/storeNavigation/ProductFoundCard';
import AppFooter from '../components/AppFooter';

interface OrbProps {
  size: number;
  color: string;
  top: number;
  left?: number;
  right?: number;
  driftX: [number, number];
  driftY: [number, number];
  duration: number;
}

function FloatingOrb({ size, color, top, left, right, driftX, driftY, duration }: OrbProps) {
  const tx = useSharedValue(driftX[0]);
  const ty = useSharedValue(driftY[0]);

  useEffect(() => {
    tx.value = withRepeat(
      withSequence(
        withTiming(driftX[1], { duration, easing: Easing.inOut(Easing.ease) }),
        withTiming(driftX[0], { duration, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    ty.value = withRepeat(
      withSequence(
        withTiming(driftY[1], { duration: duration * 1.1, easing: Easing.inOut(Easing.ease) }),
        withTiming(driftY[0], { duration: duration * 1.1, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const motion = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }] }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          top,
          left,
          right },
        motion,
      ]}
    />
  );
}

export default function StoreNavigationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { isDark, colors: C } = useResolvedTheme();

  const bgColors = useMemo<[string, string, string]>(
    () => (isDark ? ['#0A0A0F', '#0D1117', '#0A0E1A'] : ['#EEF2FF', '#F5F0FF', '#EFF6FF']),
    [isDark],
  );
  const orbBlue = isDark ? 'rgba(0,122,255,0.18)' : 'rgba(0,122,255,0.10)';
  const orbPurple = isDark ? 'rgba(175,82,222,0.14)' : 'rgba(175,82,222,0.08)';
  const orbTeal = isDark ? 'rgba(50,215,175,0.10)' : 'rgba(50,215,175,0.07)';

  const [aisles, setAisles] = useState<Aisle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationResult, setLocationResult] = useState<ProductLocationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [expandedAisleId, setExpandedAisleId] = useState<string | null>(null);
  const [highlightedProductName, setHighlightedProductName] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const aisleLayouts = useRef<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchAisles();
        if (!cancelled) setAisles(data);
      } catch {
        if (!cancelled) setAisles([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setLoading(true);
    setNotFound(false);
    setLocationResult(null);
    setHighlightedProductName(null);
    try {
      const location = await fetchProductLocation(q);
      if (location) {
        setLocationResult(location);
        setHighlightedProductName(location.product);
        const aisleId = aisles.find((a) => a.number.toUpperCase() === location.aisle.toUpperCase())?.id;
        if (aisleId) {
          setExpandedAisleId(aisleId);
          const index = aisles.findIndex((a) => a.id === aisleId);
          if (index >= 0) {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index,
                animated: true,
                viewPosition: 0.2 });
            }, 400);
          }
        }
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, aisles]);

  const toggleAisle = useCallback((aisleId: string) => {
    setExpandedAisleId((prev) => (prev === aisleId ? null : aisleId));
  }, []);

  const renderAisle = useCallback(
    ({ item }: { item: Aisle }) => {
      const expanded = expandedAisleId === item.id;
      const highlighted =
        locationResult != null && item.number.toUpperCase() === locationResult.aisle.toUpperCase();
      const showGuidance = expanded && highlighted && locationResult?.guidance?.length;
      return (
        <View
          onLayout={(e) => {
            aisleLayouts.current[item.id] = e.nativeEvent.layout.y;
          }}
          style={styles.aisleItem}
        >
          <AisleCard aisle={item} expanded={expanded} highlighted={highlighted} onPress={() => toggleAisle(item.id)}>
            <ExpandableAisleSection
              products={item.products}
              expanded={expanded}
              highlightedProductName={highlightedProductName}
            />
          </AisleCard>
          {showGuidance && <GuidanceStepsCard steps={locationResult!.guidance} visible />}
        </View>
      );
    },
    [expandedAisleId, locationResult, highlightedProductName, toggleAisle],
  );

  const headerSubtitle = useMemo(
    () =>
      aisles.length === 0
        ? 'Loading store layout…'
        : `${aisles.length} aisle${aisles.length !== 1 ? 's' : ''} · search to jump`,
    [aisles.length],
  );

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <Animated.View entering={FadeInDown.duration(380)} style={StyleSheet.absoluteFill}>
        <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <FloatingOrb size={260} color={orbBlue} top={-100} left={-70} driftX={[0, 12]} driftY={[0, 10]} duration={7000} />
        <FloatingOrb
          size={210}
          color={orbPurple}
          top={400}
          right={-55}
          driftX={[0, -10]}
          driftY={[0, 12]}
          duration={8200}
        />
        <FloatingOrb size={170} color={orbTeal} top={140} right={-35} driftX={[0, 8]} driftY={[0, -10]} duration={7600} />
        <View pointerEvents="none" style={StyleSheet.absoluteFill} />
      </Animated.View>

      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.body, { paddingTop: insets.top, paddingHorizontal: Spacing.lg }]}>
          <SharedCartHeader
            onBack={() => navigation.goBack()}
            kicker="Store map"
            title="Navigation"
            subtitle={headerSubtitle}
          />

          <Animated.View entering={FadeInDown.delay(40).duration(300)}>
            <SearchBar
              value={searchQuery}
              onChangeText={(t) => {
                setSearchQuery(t);
                if (notFound) setNotFound(false);
              }}
              onSubmit={handleSearch}
              loading={loading}
            />
          </Animated.View>

          {locationResult && (
            <Animated.View entering={FadeInDown.delay(60).duration(280)}>
              <ProductFoundCard location={locationResult} visible={!!locationResult} />
            </Animated.View>
          )}
          {notFound && (
            <Text style={[styles.notFoundText, { color: C.textSecondary }]}>
              No product found. Try another search.
            </Text>
          )}

          <Text style={[styles.sectionTitle, { color: C.text }]}>Aisles</Text>
          <FlatList
            ref={flatListRef}
            style={styles.list}
            data={aisles}
            keyExtractor={(item) => item.id}
            renderItem={renderAisle}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onScrollToIndexFailed={() => {}}
          />

          <View style={{ paddingBottom: Math.max(insets.bottom, Spacing.md) }}>
            <AppFooter />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  orb: { position: 'absolute' },
  keyboard: { flex: 1 },
  body: { flex: 1 },
  list: { flex: 1 },
  listContent: {
    paddingBottom: Spacing['2xl'] },
  aisleItem: {
    marginBottom: Spacing.sm },
  sectionTitle: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes.lg,
    marginBottom: Spacing.md },
  notFoundText: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.sm,
    marginBottom: Spacing.md } });
