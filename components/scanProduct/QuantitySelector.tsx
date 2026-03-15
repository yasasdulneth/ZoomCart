import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Typography, DarkColors, LightColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

export default function QuantitySelector({
  value,
  min = 1,
  max,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const C = isDark ? DarkColors : LightColors;

  const canDec = value > min;
  const canInc = typeof max === 'number' ? value < max : true;

  const maxText = useMemo(() => {
    if (typeof max !== 'number') return null;
    return `Max ${max}`;
  }, [max]);

  const btnBg = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)';
  const btnBorder = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(60,60,67,0.16)';

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          style={[styles.btn, { backgroundColor: btnBg, borderColor: btnBorder }, !canDec && styles.btnDisabled]}
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={!canDec}
        >
          <Text style={[styles.btnText, { color: C.text }]}>−</Text>
        </Pressable>

        <View style={styles.valueWrap}>
          <Text style={[styles.value, { color: C.text }]}>{value}</Text>
          {!!maxText && (
            <Text style={[styles.max, { color: C.textSecondary }]}>{maxText}</Text>
          )}
        </View>

        <Pressable
          style={[styles.btn, { backgroundColor: btnBg, borderColor: btnBorder }, !canInc && styles.btnDisabled]}
          onPress={() => onChange(typeof max === 'number' ? Math.min(max, value + 1) : value + 1)}
          disabled={!canInc}
        >
          <Text style={[styles.btnText, { color: C.text }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: {
    fontFamily: Typography.fonts.primarySemiBold,
    fontSize: Typography.sizes['2xl'],
    marginTop: -2,
  },
  valueWrap: { alignItems: 'center', gap: 2 },
  value: {
    fontFamily: Typography.fonts.accentBold,
    fontSize: Typography.sizes['3xl'],
    minWidth: 52,
    textAlign: 'center',
  },
  max: {
    fontFamily: Typography.fonts.secondary,
    fontSize: Typography.sizes.xs,
  },
});
